import * as v from "valibot";
import { DURATION_MS, INTERVAL_OPTIONS } from "../../lib/queries/constants";
import type { DashboardContext } from "../../lib/assistant/dashboard-context";
import { getTimeWindow } from "../../lib/queries/timeWindow";

export const emptyInput = v.strictObject({});
const limit = v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)), 10);
export const breakdownInput = v.strictObject({ dimension: v.picklist(["event", "language"]), limit });
export const topPagesInput = v.strictObject({ limit });
export const recentEventsInput = v.strictObject({ limit });
export const pageActivityInput = v.strictObject({
  path: v.pipe(v.string(), v.minLength(1), v.maxLength(512), v.startsWith("/")),
  language: v.pipe(v.string(), v.minLength(1), v.maxLength(32), v.regex(/^[a-z][a-z0-9-]*$/)),
});
export type BreakdownInput = v.InferOutput<typeof breakdownInput>;
export type PageActivityInput = v.InferOutput<typeof pageActivityInput>;

export function comparisonPlan(context: DashboardContext, now: number) {
  const current = getTimeWindow(context, now);
  const duration = current.until.getTime() - current.since.getTime();
  if (duration > 30 * DURATION_MS["1d"]) throw new Error("Choose a dashboard period of at most 30 days to compare");
  return { current, previous: { since: new Date(current.since.getTime() - duration), until: current.since } };
}

export function metricChange(current: number, previous: number) {
  return { current, previous, difference: current - previous,
    percentageChange: previous === 0 ? (current === 0 ? 0 : null) : Math.round((current - previous) / previous * 10_000) / 100 };
}

export function seriesPlan(context: DashboardContext, now: number) {
  const { since, until } = getTimeWindow(context, now);
  const duration = until.getTime() - since.getTime();
  const interval = INTERVAL_OPTIONS.find((value) => DURATION_MS[value] >= DURATION_MS[context.interval] && Math.ceil(duration / DURATION_MS[value]) <= 120);
  if (!interval) throw new Error("Series exceeds the bucket limit");
  const bucketMs = DURATION_MS[interval];
  const buckets = Math.ceil(duration / bucketMs);
  return { interval, bucketMs, buckets, anchorMs: until.getTime() - buckets * bucketMs };
}
