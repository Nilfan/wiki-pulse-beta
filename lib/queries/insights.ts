import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { DURATION_MS } from "./constants";
import type { DashboardSearchParams } from "./dashboardSearchParams";
import { getBucketStarts, type TimeWindow } from "./events";

export type InsightsBucket = {
  /** Bucket start, epoch milliseconds. */
  timestamp: number;
  events: number;
  /** Distinct wiki languages (stored in the `country` column). */
  wikis: number;
  paths: number;
};

export type InsightsType = {
  type: string;
  count: number;
};

/**
 * Headline figures for the insights strip. Already JSON-safe, so the server
 * render and the insights API route hand the client the same object.
 *
 * Window totals are counted over the whole window rather than summed from the
 * buckets: a wiki or a path that spans several buckets is one, not many.
 */
export type Insights = {
  events: number;
  /** Distinct wiki languages (stored in the `country` column). */
  wikis: number;
  paths: number;
  /** Newest event in the window, epoch milliseconds; null for an empty one. */
  lastEventMs: number | null;
  untilMs: number;
  /** Every bucket in the window, zero-filled, ascending. */
  buckets: InsightsBucket[];
  /** Events per type, busiest first. */
  types: InsightsType[];
};

type InsightsRow = {
  events: number;
  /** Distinct wiki languages (stored in the `country` column). */
  wikis: number;
  paths: number;
  last_event_ms: number | null;
  /** [bucket_ms, events, wikis, paths] for buckets holding events. */
  buckets: [number, number, number, number][];
  /** [type, count], busiest first. */
  types: [string, number][];
};

/**
 * groupBy is not part of the params here: the strip always describes the
 * whole filtered traffic, so regrouping the chart must not refetch or re-key
 * this entry. Callers pass what is left.
 */
async function getInsightsRow(
  orgId: string,
  params: Omit<DashboardSearchParams, "groupBy">,
  timeWindow: TimeWindow,
): Promise<InsightsRow> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org:${orgId}`);

  // Same bounds and bucket arithmetic as getEventsSeriesBuckets, so a bucket
  // here is exactly a bucket on the chart.
  const until = BigInt(timeWindow.until.getTime());
  const since = BigInt(timeWindow.since.getTime());
  const interval = BigInt(DURATION_MS[params.interval]);

  const [row] = await prisma.$queryRaw<InsightsRow[]>`
    WITH filtered AS (
      SELECT
        e."timestamp",
        e."type",
        e."country",
        e."path",
        ${until}::bigint - ceil(
          (${until}::bigint - (extract(epoch FROM e."timestamp") * 1000)::bigint)::numeric
            / ${interval}::numeric
        )::bigint * ${interval}::bigint AS bucket_ms
      FROM "Event" e
      WHERE e."org_id" = ${orgId}::bigint
        AND e."timestamp" >= to_timestamp(${since}::bigint / 1000.0) AT TIME ZONE 'UTC'
        AND e."timestamp" < to_timestamp(${until}::bigint / 1000.0) AT TIME ZONE 'UTC'
        ${params.eventType.length ? Prisma.sql`AND e."type" = ANY(${params.eventType}::text[])` : Prisma.empty}
    ),
    buckets AS (
      SELECT
        bucket_ms,
        count(*)::int AS events,
        count(DISTINCT country)::int AS wikis,
        count(DISTINCT path)::int AS paths
      FROM filtered
      GROUP BY bucket_ms
    )
    SELECT
      (SELECT count(*)::int FROM filtered) AS events,
      (SELECT count(DISTINCT country)::int FROM filtered) AS wikis,
      (SELECT count(DISTINCT path)::int FROM filtered) AS paths,
      (SELECT (extract(epoch FROM max("timestamp")) * 1000)::float8 FROM filtered) AS last_event_ms,
      COALESCE(
        (SELECT json_agg(json_build_array(bucket_ms, events, wikis, paths)) FROM buckets),
        '[]'::json
      ) AS buckets,
      COALESCE(
        (
          SELECT json_agg(json_build_array("type", events) ORDER BY events DESC, "type")
          FROM (SELECT "type", count(*)::int AS events FROM filtered GROUP BY "type") t
        ),
        '[]'::json
      ) AS types
  `;

  return row;
}

export async function getInsights(
  orgId: string,
  { range, interval, eventType }: DashboardSearchParams,
  timeWindow: TimeWindow,
): Promise<Insights> {
  const params = { range, interval, eventType };
  const row = await getInsightsRow(orgId, params, timeWindow);

  const byBucket = new Map<number, InsightsBucket>();
  for (const [timestamp, events, wikis, paths] of row.buckets) {
    byBucket.set(Number(timestamp), {
      timestamp: Number(timestamp),
      events,
      wikis,
      paths,
    });
  }

  const buckets = getBucketStarts({ ...params, groupBy: [] }, timeWindow).map(
    (timestamp) =>
      byBucket.get(timestamp) ?? {
        timestamp,
        events: 0,
        wikis: 0,
        paths: 0,
      },
  );

  return {
    events: row.events,
    wikis: row.wikis,
    paths: row.paths,
    lastEventMs: row.last_event_ms,
    untilMs: timeWindow.until.getTime(),
    buckets,
    types: row.types.map(([type, count]) => ({ type, count })),
  };
}
