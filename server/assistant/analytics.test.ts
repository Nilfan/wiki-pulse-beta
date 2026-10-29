import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";
import { createAssistantAnalytics } from "./analytics";
import { WIKI_ORG } from "../../prisma/constants";

test("real read-only analytics matches independent scoped database counts", { skip: !process.env.ASSISTANT_DB_TEST_URL, timeout: 15_000 }, async (t) => {
  const connectionString = process.env.ASSISTANT_DB_TEST_URL!;
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2_000 });
  const database = createAssistantAnalytics(connectionString);
  t.after(async () => { await database.close(); await pool.end(); });
  const latest = await pool.query<{ id: string; latest: number | null }>(`
    SELECT o.id::text, (extract(epoch FROM max(e.timestamp)) * 1000)::float8 AS latest
    FROM "Organization" o LEFT JOIN "Event" e ON e.org_id = o.id WHERE o.slug = $1 GROUP BY o.id
  `, [WIKI_ORG.slug]);
  assert.ok(latest.rows[0], "Wikipedia organization must exist for the live database test");
  const until = new Date((latest.rows[0].latest ?? Date.now()) + 60_000);
  const since = new Date(until.getTime() - 86_400_000);
  const signal = AbortSignal.timeout(10_000);
  for (const eventType of [[], ["__assistant_test_no_such_type__"]]) {
    const summary = await database.analytics.summary({ range: "custom", start: since.toISOString(), end: until.toISOString(), interval: "5m", eventType, page: [], country: [], groupBy: [] }, Date.now(), signal) as { events: number; pages: number; languages: number };
    const expected = await pool.query(`SELECT count(*)::int AS events, count(DISTINCT (host,path))::int AS pages, count(DISTINCT country)::int AS languages
      FROM "Event" WHERE org_id = $1::bigint AND timestamp >= ($2::timestamptz AT TIME ZONE 'UTC') AND timestamp < ($3::timestamptz AT TIME ZONE 'UTC')
      AND (cardinality($4::text[]) = 0 OR type = ANY($4::text[]))`, [latest.rows[0].id, since.toISOString(), until.toISOString(), eventType]);
    assert.equal(summary.events, expected.rows[0].events);
    assert.equal(summary.pages, expected.rows[0].pages);
    assert.equal(summary.languages, expected.rows[0].languages);
  }
  const status = await database.analytics.status(signal) as { lastEventMs: number | null; collectorRunning: string };
  assert.equal(status.lastEventMs, latest.rows[0].latest);
  assert.equal(status.collectorRunning, "unknown");
  const context = { range: "custom" as const, start: since.toISOString(), end: until.toISOString(), interval: "5m" as const, eventType: [], page: [], country: [], groupBy: [] };
  const now = Date.now();
  const summary = await database.analytics.summary(context, now, signal) as { events: number; pages: number };
  const series = await database.analytics.series(context, now, signal) as { events: number; buckets: { timestamp: number; events: number }[] };
  assert.ok(series.buckets.length <= 120);
  assert.equal(series.events, summary.events);
  assert.equal(series.buckets.reduce((sum, bucket) => sum + bucket.events, 0), summary.events);
  const breakdown = await database.analytics.breakdown(context, { dimension: "event", limit: 2 }, now, signal) as { events: number; otherEvents: number; rows: { value: string; events: number; percentage: number }[] };
  assert.equal(breakdown.events, summary.events);
  assert.equal(breakdown.rows.reduce((sum, row) => sum + row.events, 0) + breakdown.otherEvents, summary.events);
  assert.ok(breakdown.rows.every((row) => row.percentage >= 0 && row.percentage <= 100));
  const expectedTypes = await pool.query(`SELECT type AS value, count(*)::int AS events FROM "Event"
    WHERE org_id = $1::bigint AND timestamp >= ($2::timestamptz AT TIME ZONE 'UTC') AND timestamp < ($3::timestamptz AT TIME ZONE 'UTC')
    GROUP BY type ORDER BY events DESC, value LIMIT 2`, [latest.rows[0].id, since.toISOString(), until.toISOString()]);
  assert.deepEqual(breakdown.rows.map(({ value, events }) => ({ value, events })), expectedTypes.rows);
  const pages = await database.analytics.topPages(context, 2, now, signal) as { events: number; pageCount: number; otherEvents: number; rows: { host: string; path: string; events: number }[] };
  assert.equal(pages.events, summary.events);
  assert.equal(pages.pageCount, summary.pages);
  assert.equal(pages.rows.reduce((sum, row) => sum + row.events, 0) + pages.otherEvents, summary.events);
  const known = await pool.query<{ path: string; language: string }>(`SELECT path, country AS language FROM "Event" WHERE org_id = $1::bigint
    AND country ~ '^[a-z][a-z0-9-]*$' AND path LIKE '/%' LIMIT 1`, [latest.rows[0].id]);
  if (known.rows[0]) {
    const page = known.rows[0];
    const activity = await database.analytics.pageActivity(context, page, now, signal) as { events: number };
    const expected = await pool.query(`SELECT count(*)::int AS events FROM "Event" WHERE org_id = $1::bigint
      AND timestamp >= ($2::timestamptz AT TIME ZONE 'UTC') AND timestamp < ($3::timestamptz AT TIME ZONE 'UTC') AND path = $4 AND country = $5`,
      [latest.rows[0].id, since.toISOString(), until.toISOString(), page.path, page.language]);
    assert.equal(activity.events, expected.rows[0].events);
    const conflicting = await database.analytics.pageActivity({ ...context, page: ["/__not_the_requested_page__"] }, page, now, signal) as { events: number };
    assert.equal(conflicting.events, 0);
  }
  const emptySeries = await database.analytics.series({ ...context, eventType: ["__assistant_test_no_such_type__"] }, now, signal) as { events: number; buckets: { events: number }[] };
  assert.equal(emptySeries.events, 0);
  assert.ok(emptySeries.buckets.length > 0 && emptySeries.buckets.every((bucket) => bucket.events === 0));
  const comparison = await database.analytics.compare(context, now, signal) as { metrics: { events: { current: number; previous: number; difference: number; percentageChange: number | null } } };
  assert.equal(comparison.metrics.events.current, summary.events);
  const previousSince = new Date(since.getTime() - (until.getTime() - since.getTime()));
  const previous = await pool.query(`SELECT count(*)::int AS events FROM "Event" WHERE org_id = $1::bigint
    AND timestamp >= ($2::timestamptz AT TIME ZONE 'UTC') AND timestamp < ($3::timestamptz AT TIME ZONE 'UTC')`,
    [latest.rows[0].id, previousSince.toISOString(), since.toISOString()]);
  assert.equal(comparison.metrics.events.previous, previous.rows[0].events);
  assert.equal(comparison.metrics.events.difference, summary.events - previous.rows[0].events);
  const recent = await database.analytics.recent(context, 2, now, signal) as { rows: { id: string; timestampMs: number; type: string; host: string; path: string; language: string | null }[]; hasMore: boolean };
  const newest = await pool.query(`SELECT id::text, (extract(epoch FROM timestamp) * 1000)::float8 AS "timestampMs", type, host, path, country AS language
    FROM "Event" WHERE org_id = $1::bigint AND timestamp >= ($2::timestamptz AT TIME ZONE 'UTC') AND timestamp < ($3::timestamptz AT TIME ZONE 'UTC')
    ORDER BY timestamp DESC, id DESC LIMIT 2`, [latest.rows[0].id, since.toISOString(), until.toISOString()]);
  assert.deepEqual(recent.rows, newest.rows);
  assert.equal(recent.hasMore, summary.events > 2);
  assert.ok(recent.rows.every((row) => Object.keys(row).every((key) => ["id", "timestampMs", "type", "host", "path", "language"].includes(key))));
});
