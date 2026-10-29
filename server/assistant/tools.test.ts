import assert from "node:assert/strict";
import { test } from "node:test";
import * as v from "valibot";
import { createAssistantTools } from "./tools";
import { dashboardContextSchema } from "../../lib/assistant/dashboard-context";
import { createAssistantAnalytics } from "./analytics";
import { parseClientFrame } from "./protocol";
import { seriesPlan, comparisonPlan, metricChange } from "./analytics-inputs";

const context = { range: "24h", interval: "5m", groupBy: [], eventType: ["edit"], page: [], country: ["en"] } as const;
const dashboard = v.parse(dashboardContextSchema, context);
async function invoke(instrument: { execute?: unknown }, input: unknown = {}) {
  const execute = instrument.execute as (input: unknown, options: unknown) => Promise<{ ok: boolean }>;
  return execute(input, { toolCallId: "test", messages: [], context: {} });
}

test("read-only tools are allowlisted and bound to the supplied context", async () => {
  let observed: unknown;
  const tools = createAssistantTools({ context: dashboard, nowMs: Date.parse("2026-10-29T12:00:00Z"), signal: new AbortController().signal,
    analytics: { summary: async (value) => { observed = value; return { events: 10 }; }, status: async () => ({ lastEventMs: null }) } });
  assert.deepEqual(Object.keys(tools), ["compareActivityPeriods", "getRecentEvents", "getPlatformHelp", "getDashboardContext", "getActivitySummary", "getCollectionStatus", "getActivitySeries", "getActivityBreakdown", "getTopPages", "getPageActivity"]);
  const help = await invoke(tools.getPlatformHelp);
  assert.equal(help.ok, true);
  const current = await invoke(tools.getDashboardContext);
  assert.equal(current.ok, true);
  const summary = await invoke(tools.getActivitySummary);
  assert.equal(summary.ok, true);
  assert.deepEqual(observed, dashboard);
  assert.equal((await invoke(tools.getCollectionStatus)).ok, true);
  assert.equal((await invoke(tools.getActivitySummary)).ok, false);
});

test("new instruments validate arguments before execution and preserve context", async () => {
  const observed: { name: string; context: unknown; input?: unknown }[] = [];
  const tools = createAssistantTools({ context: dashboard, signal: new AbortController().signal, analytics: {
    series: async (context) => { observed.push({ name: "series", context }); return {}; },
    breakdown: async (context, input) => { observed.push({ name: "breakdown", context, input }); return {}; },
    topPages: async (context, limit) => { observed.push({ name: "topPages", context, input: limit }); return {}; },
    pageActivity: async (context, input) => { observed.push({ name: "pageActivity", context, input }); return {}; },
  } });
  for (const [instrument, input] of [
    [tools.getTopPages, { limit: 21 }], [tools.getTopPages, { limit: 0 }], [tools.getTopPages, { limit: 1.5 }],
    [tools.getActivityBreakdown, { dimension: "org_id" }], [tools.getActivityBreakdown, { dimension: "event", sql: "SELECT 1" }],
    [tools.getPageActivity, { path: "https://example.com", language: "en" }],
    [tools.getPageActivity, { path: "/wiki/Test", language: "en", orgId: "2" }],
  ] as const) await assert.rejects(invoke(instrument, input));
  assert.equal(observed.length, 0);
  assert.equal((await invoke(tools.getActivitySeries)).ok, true);
  assert.equal((await invoke(tools.getActivityBreakdown, { dimension: "event" })).ok, true);
  assert.equal((await invoke(tools.getTopPages)).ok, true);
  assert.equal((await invoke(tools.getPageActivity, { path: "/wiki/Test", language: "en" })).ok, true);
  assert.ok(observed.every((call) => call.context === dashboard));
  assert.deepEqual(observed[1].input, { dimension: "event", limit: 10 });
  assert.equal(observed[2].input, 10);
  assert.equal((await invoke(tools.getTopPages)).ok, false);
  assert.equal(observed.length, 4);
});

test("series are bounded, coarsened only when needed, and preserve partial windows", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const hourly = seriesPlan({ ...dashboard, range: "1h" }, now);
  assert.equal(hourly.buckets, 12);
  assert.equal(hourly.interval, "5m");
  const long = seriesPlan({ ...dashboard, range: "60d" }, now);
  assert.equal(long.interval, "1d");
  assert.equal(long.buckets, 60);
  const partial = seriesPlan({ ...dashboard, range: "custom", start: "2026-10-29T11:56:00.000Z", end: "2026-10-29T12:02:00.000Z" }, now);
  assert.equal(partial.buckets, 2);
  assert.equal(partial.anchorMs, Date.parse("2026-10-29T11:52:00Z"));
});

test("comparisons preserve adjacent bounds and handle zero baselines", () => {
  const plan = comparisonPlan({ ...dashboard, range: "custom", start: "2026-10-29T10:02:00.000Z", end: "2026-10-29T11:02:00.000Z" }, Date.now());
  assert.equal(plan.previous.since.toISOString(), "2026-10-29T09:02:00.000Z");
  assert.equal(plan.previous.until.getTime(), plan.current.since.getTime());
  assert.deepEqual(metricChange(12, 8), { current: 12, previous: 8, difference: 4, percentageChange: 50 });
  assert.equal(metricChange(8, 0).percentageChange, null);
  assert.equal(metricChange(0, 0).percentageChange, 0);
  assert.equal(metricChange(0, 8).percentageChange, -100);
  assert.throws(() => comparisonPlan({ ...dashboard, range: "60d" }, Date.now()), /30 days/);
});

test("comparison and recent-event instruments preserve scope and reject expanded access", async () => {
  let comparisons = 0;
  let limit: number | undefined;
  const tools = createAssistantTools({ context: dashboard, signal: new AbortController().signal, analytics: {
    compare: async (context) => { assert.deepEqual(context, dashboard); comparisons++; return {}; },
    recent: async (context, value) => { assert.deepEqual(context, dashboard); limit = value; return {}; },
  } });
  await assert.rejects(invoke(tools.compareActivityPeriods, { organization: "other" }));
  await assert.rejects(invoke(tools.getRecentEvents, { limit: 100 }));
  await assert.rejects(invoke(tools.getRecentEvents, { limit: 1, includeProperties: true }));
  assert.equal((await invoke(tools.compareActivityPeriods)).ok, true);
  assert.equal(comparisons, 1);
  assert.equal((await invoke(tools.getRecentEvents)).ok, true);
  assert.equal(limit, 10);
  const broad = createAssistantTools({ context: { ...dashboard, range: "60d" }, signal: new AbortController().signal,
    analytics: { compare: async () => { comparisons++; return {}; } } });
  await invoke(broad.compareActivityPeriods);
  assert.equal(comparisons, 1);
});

test("tools reject arbitrary arguments, missing context, unavailable data, and aborts", async () => {
  const controller = new AbortController();
  const tools = createAssistantTools({ signal: controller.signal });
  await assert.rejects(async () => invoke(tools.getPlatformHelp, { orgId: "other" }));
  assert.equal((await invoke(tools.getDashboardContext)).ok, true);
  assert.equal((await invoke(tools.getActivitySummary)).ok, false);
  assert.equal((await invoke(tools.getCollectionStatus)).ok, false);
  controller.abort();
  await assert.rejects(async () => invoke(tools.getPlatformHelp), { name: "AbortError" });
  const database = createAssistantAnalytics();
  await assert.rejects(database.analytics.status(new AbortController().signal), /unavailable/);
  await database.close();
});

test("wire context rejects tenant selectors and invalid date/filter bounds", () => {
  const base = { version: 1, type: "chat", requestId: "ctx", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "summary" }] }], dashboardContext: dashboard };
  assert.ok(parseClientFrame(JSON.stringify(base)));
  for (const invalid of [
    { ...dashboard, orgId: "2" },
    { ...dashboard, country: Array(51).fill("en") },
    { ...dashboard, range: "custom", start: "2026-01-01T00:00:00.000Z", end: "2026-10-01T00:00:00.000Z" },
    { ...dashboard, range: "custom", start: "invalid", end: "invalid" },
  ]) assert.equal(parseClientFrame(JSON.stringify({ ...base, dashboardContext: invalid })), null);
});
