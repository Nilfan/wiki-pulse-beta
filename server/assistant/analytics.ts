import { Pool, type PoolClient } from "pg";
import { dashboardContextSchema, type DashboardContext } from "../../lib/assistant/dashboard-context";
import * as v from "valibot";
import { breakdownInput, pageActivityInput, topPagesInput, recentEventsInput, seriesPlan, comparisonPlan, metricChange, type BreakdownInput, type PageActivityInput } from "./analytics-inputs";
import { getTimeWindow } from "../../lib/queries/timeWindow";
import { WIKI_ORG } from "../../prisma/constants";

export type Analytics = {
  summary: (context: DashboardContext, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  status: (signal: AbortSignal) => Promise<unknown>;
  series: (context: DashboardContext, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  breakdown: (context: DashboardContext, input: BreakdownInput, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  topPages: (context: DashboardContext, limit: number, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  pageActivity: (context: DashboardContext, input: PageActivityInput, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  compare: (context: DashboardContext, nowMs: number, signal: AbortSignal) => Promise<unknown>;
  recent: (context: DashboardContext, limit: number, nowMs: number, signal: AbortSignal) => Promise<unknown>;
};

// Fixed identifiers only. All caller-provided values are bound parameters.
const FILTERED = `WITH filtered AS MATERIALIZED (
  SELECT e.id, e.type, e.host, e.path, e.country, e.timestamp FROM "Event" e
  WHERE e.org_id = $1::bigint
    AND e.timestamp >= ($2::timestamptz AT TIME ZONE 'UTC')
    AND e.timestamp < ($3::timestamptz AT TIME ZONE 'UTC')
    AND (cardinality($4::text[]) = 0 OR e.type = ANY($4::text[]))
    AND (cardinality($5::text[]) = 0 OR e.path = ANY($5::text[]))
    AND (cardinality($6::text[]) = 0 OR COALESCE(e.country, 'unknown') = ANY($6::text[]))
)`;

/** Separate, lazy pool: neither help nor dashboard context opens a DB connection. */
export function createAssistantAnalytics(connectionString?: string) {
  let pool: Pool | undefined;
  let closing: Promise<void> | undefined;
  async function read<T>(signal: AbortSignal, run: (client: PoolClient, orgId: string) => Promise<T>) {
    signal.throwIfAborted();
    if (!connectionString || closing) throw new Error("Assistant database unavailable");
    pool ??= new Pool({ connectionString, max: 2, connectionTimeoutMillis: 2_000, idleTimeoutMillis: 10_000 });
    const client = await pool.connect();
    try {
      signal.throwIfAborted();
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = '3000ms'");
      const org = await client.query<{ id: string }>('SELECT id::text FROM "Organization" WHERE slug = $1 LIMIT 1', [WIKI_ORG.slug]);
      if (!org.rows[0]) throw new Error("Wikipedia organization unavailable");
      signal.throwIfAborted();
      const result = await run(client, org.rows[0].id);
      signal.throwIfAborted();
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  }
  async function report(context: DashboardContext, nowMs: number, signal: AbortSignal,
    query: (client: PoolClient, values: unknown[]) => Promise<object>) {
    v.parse(dashboardContextSchema, context);
    const window = getTimeWindow(context, nowMs);
    return read(signal, async (client, orgId) => ({
      organization: "Wikipedia", since: window.since.toISOString(), until: window.until.toISOString(), checkedAt: new Date(nowMs).toISOString(),
      filters: { eventType: context.eventType, page: context.page, language: context.country },
      scope: "Collected sample only, not total Wikipedia activity. All current filters apply; limited rankings do not represent the whole total.",
      ...await query(client, [orgId, window.since.toISOString(), window.until.toISOString(), context.eventType, context.page, context.country]),
    }));
  }
  const analytics: Analytics = {
    summary: async (context, nowMs, signal) => {
      v.parse(dashboardContextSchema, context);
      const window = getTimeWindow(context, nowMs);
      return read(signal, async (client, orgId) => {
        // All value filters apply to totals AND type counts; no dashboard facet semantics.
        const result = await client.query(`
          WITH filtered AS MATERIALIZED (
            SELECT e.type, e.host, e.path, e.country, e.timestamp
            FROM "Event" e WHERE e.org_id = $1::bigint
              AND e.timestamp >= ($2::timestamptz AT TIME ZONE 'UTC')
              AND e.timestamp < ($3::timestamptz AT TIME ZONE 'UTC')
              AND (cardinality($4::text[]) = 0 OR e.type = ANY($4::text[]))
              AND (cardinality($5::text[]) = 0 OR e.path = ANY($5::text[]))
              AND (cardinality($6::text[]) = 0 OR COALESCE(e.country, 'unknown') = ANY($6::text[]))
          ), types AS (SELECT type, count(*)::int AS count FROM filtered GROUP BY type)
          SELECT count(*)::int AS events, count(DISTINCT (host, path))::int AS pages,
            count(DISTINCT host)::int AS wikis, count(DISTINCT country)::int AS languages,
            (extract(epoch FROM max(timestamp)) * 1000)::float8 AS "lastEventMs",
            COALESCE((SELECT json_agg(t) FROM (SELECT * FROM types ORDER BY count DESC, type LIMIT 20) t), '[]'::json) AS "eventTypes",
            (SELECT count(*)::int FROM types) AS "eventTypeCount"
          FROM filtered
        `, [orgId, window.since.toISOString(), window.until.toISOString(), context.eventType, context.page, context.country]);
        return { organization: "Wikipedia", since: window.since.toISOString(), until: window.until.toISOString(),
          filters: { eventType: context.eventType, page: context.page, language: context.country },
          checkedAt: new Date(nowMs).toISOString(), ...result.rows[0],
          scope: "Collected sample only, not total Wikipedia activity. Event types limited to top 20; null languages excluded from language count." };
      });
    },
    series: async (context, nowMs, signal) => {
      v.parse(dashboardContextSchema, context);
      const plan = seriesPlan(context, nowMs);
      return report(context, nowMs, signal, async (client, values) => {
        const result = await client.query<{ bucket: number; events: number }>(`${FILTERED}
          SELECT floor(((extract(epoch FROM timestamp) * 1000) - $7::bigint) / $8::numeric)::int AS bucket,
            count(*)::int AS events FROM filtered GROUP BY bucket ORDER BY bucket`, [...values, plan.anchorMs, plan.bucketMs]);
        const counts = new Map(result.rows.map((row) => [row.bucket, row.events]));
        const buckets = Array.from({ length: plan.buckets }, (_, index) => ({ timestamp: plan.anchorMs + index * plan.bucketMs, events: counts.get(index) ?? 0 }));
        return { interval: plan.interval, requestedInterval: context.interval, coarsened: plan.interval !== context.interval,
          alignment: "Bucket boundaries anchored to until; the first bucket can be partial. Counts include only the reported period.",
          events: buckets.reduce((sum, bucket) => sum + bucket.events, 0), buckets };
      });
    },
    breakdown: async (context, input, nowMs, signal) => {
      const parsed = v.parse(breakdownInput, input);
      const column = parsed.dimension === "event" ? "type" : "COALESCE(country, 'unknown')";
      return report(context, nowMs, signal, async (client, values) => {
        const result = await client.query<{ value: string; events: number; total: number; groups: number }>(`${FILTERED},
          grouped AS (SELECT ${column} AS value, count(*)::int AS events FROM filtered GROUP BY ${column})
          SELECT value, events, sum(events) OVER ()::int AS total, count(*) OVER ()::int AS groups
          FROM grouped ORDER BY events DESC, value LIMIT $7`, [...values, parsed.limit]);
        const total = result.rows[0]?.total ?? 0;
        return { dimension: parsed.dimension, events: total, groupCount: result.rows[0]?.groups ?? 0,
          otherEvents: total - result.rows.reduce((sum, row) => sum + row.events, 0),
          rows: result.rows.map(({ value, events }) => ({ value, events, percentage: total ? Math.round(events / total * 10_000) / 100 : 0 })) };
      });
    },
    topPages: async (context, limit, nowMs, signal) => {
      const parsed = v.parse(topPagesInput, { limit });
      return report(context, nowMs, signal, async (client, values) => {
        const result = await client.query<{ host: string; path: string; events: number; total: number; pages: number }>(`${FILTERED},
          grouped AS (SELECT host, path, count(*)::int AS events FROM filtered GROUP BY host, path)
          SELECT host, path, events, sum(events) OVER ()::int AS total, count(*) OVER ()::int AS pages
          FROM grouped ORDER BY events DESC, host, path LIMIT $7`, [...values, parsed.limit]);
        const total = result.rows[0]?.total ?? 0;
        return { events: total, pageCount: result.rows[0]?.pages ?? 0, otherEvents: total - result.rows.reduce((sum, row) => sum + row.events, 0),
          rows: result.rows.map(({ host, path, events }) => ({ host, path, events })) };
      });
    },
    pageActivity: async (context, input, nowMs, signal) => {
      const parsed = v.parse(pageActivityInput, input);
      return report(context, nowMs, signal, async (client, values) => {
        // Intersect exact page/language with existing filters; never broaden scope.
        const result = await client.query(`${FILTERED}
          SELECT count(*)::int AS events, count(DISTINCT host)::int AS wikis,
            (extract(epoch FROM min(timestamp)) * 1000)::float8 AS "firstEventMs",
            (extract(epoch FROM max(timestamp)) * 1000)::float8 AS "lastEventMs"
          FROM filtered WHERE path = $7 AND country = $8`, [...values, parsed.path, parsed.language]);
        return { page: parsed, ...result.rows[0], note: "Exact stored path and wiki language, intersected with dashboard filters. Zero does not prove a page does not exist." };
      });
    },
    compare: async (context, nowMs, signal) => {
      v.parse(dashboardContextSchema, context);
      const plan = comparisonPlan(context, nowMs);
      return read(signal, async (client, orgId) => {
        const result = await client.query<{ period: string; events: number; pages: number; wikis: number; languages: number }>(`${FILTERED}
          SELECT CASE WHEN timestamp < ($7::timestamptz AT TIME ZONE 'UTC') THEN 'previous' ELSE 'current' END AS period,
            count(*)::int AS events, count(DISTINCT (host,path))::int AS pages,
            count(DISTINCT host)::int AS wikis, count(DISTINCT country)::int AS languages
          FROM filtered GROUP BY period`, [orgId, plan.previous.since.toISOString(), plan.current.until.toISOString(),
          context.eventType, context.page, context.country, plan.current.since.toISOString()]);
        const empty = { events: 0, pages: 0, wikis: 0, languages: 0 };
        const current = result.rows.find((row) => row.period === "current") ?? empty;
        const previous = result.rows.find((row) => row.period === "previous") ?? empty;
        return { organization: "Wikipedia", checkedAt: new Date(nowMs).toISOString(),
          currentPeriod: { since: plan.current.since.toISOString(), until: plan.current.until.toISOString() },
          previousPeriod: { since: plan.previous.since.toISOString(), until: plan.previous.until.toISOString() },
          filters: { eventType: context.eventType, page: context.page, language: context.country },
          metrics: Object.fromEntries((["events", "pages", "wikis", "languages"] as const).map((key) => [key, metricChange(current[key], previous[key])])),
          scope: "Collected samples only. Equal-duration adjacent half-open periods; the same filters apply to both. Percentage change is null for a zero baseline with nonzero current activity. Sampling changes or retention can affect comparisons; complete historical coverage is not guaranteed." };
      });
    },
    recent: async (context, limit, nowMs, signal) => {
      const parsed = v.parse(recentEventsInput, { limit });
      return report(context, nowMs, signal, async (client, values) => {
        const result = await client.query(`${FILTERED}
          SELECT id::text, (extract(epoch FROM timestamp) * 1000)::float8 AS "timestampMs", type, host, path, country AS language
          FROM filtered ORDER BY timestamp DESC, id DESC LIMIT $7`, [...values, parsed.limit + 1]);
        return { rows: result.rows.slice(0, parsed.limit), limit: parsed.limit, hasMore: result.rows.length > parsed.limit,
          note: "Newest stored events in the selected period, not a live stream. Article text, user agents, sessions, and event properties are not included." };
      });
    },
    status: async (signal) => read(signal, async (client, orgId) => {
      const result = await client.query<{ lastEventMs: number | null }>(
        'SELECT (extract(epoch FROM max(timestamp)) * 1000)::float8 AS "lastEventMs" FROM "Event" WHERE org_id = $1::bigint', [orgId]);
      const checkedAtMs = Date.now();
      const lastEventMs = result.rows[0].lastEventMs;
      return { organization: "Wikipedia", lastEventMs, checkedAtMs,
        ageMs: lastEventMs === null ? null : Math.max(0, checkedAtMs - lastEventMs),
        collectorRunning: "unknown", scope: "Latest stored event is not proof that the collector process is running." };
    }),
  };
  return { analytics, close: () => { closing ??= pool?.end() ?? Promise.resolve(); return closing; } };
}
