import { DURATION_MS, SERIES_ALIGNMENT_MS } from "./constants";
import type { DashboardSearchParams } from "./dashboardSearchParams";

export const MAX_CUSTOM_RANGE_MS = DURATION_MS["60d"];
export type DashboardPeriod = Pick<DashboardSearchParams, "range" | "start" | "end">;
export type TimeWindow = { since: Date; until: Date };

/** Canonical UTC timestamps only, so malformed dates cannot silently roll over. */
export function getCustomPeriodError(start?: string, end?: string): string | null {
  if (!start || !end) return "Choose both a start and an end timestamp.";
  const values = [start, end];
  const timestamps = values.map((value) => new Date(value));
  if (timestamps.some((date, index) =>
    !Number.isFinite(date.getTime()) || date.toISOString() !== values[index],
  )) {
    return "Choose valid start and end timestamps.";
  }
  const duration = timestamps[1].getTime() - timestamps[0].getTime();
  if (duration <= 0) return "End must be after start.";
  if (duration > MAX_CUSTOM_RANGE_MS) return "Choose a period of 60 days or less.";
  return null;
}

/**
 * Relative windows share a cache grid; custom windows preserve exact bounds.
 * Call outside cached queries so the clock keeps advancing for relative ranges.
 */
export function getTimeWindow(
  params: DashboardPeriod,
  nowMs = Date.now(),
): TimeWindow {
  if (params.range === "custom" && params.start && params.end &&
      !getCustomPeriodError(params.start, params.end)) {
    return { since: new Date(params.start), until: new Date(params.end) };
  }
  const range = params.range === "custom" ? "24h" : params.range;
  const untilMs = Math.floor(nowMs / SERIES_ALIGNMENT_MS) * SERIES_ALIGNMENT_MS;
  return { since: new Date(untilMs - DURATION_MS[range]), until: new Date(untilMs) };
}

/** Custom windows are already fixed, so paging cannot override their bounds. */
export function resolveBreakdownTimeWindow(
  params: DashboardPeriod,
  pinnedUntilMs?: number,
  nowMs = Date.now(),
): TimeWindow {
  const current = getTimeWindow(params, nowMs);
  if (
    params.range === "custom" ||
    pinnedUntilMs === undefined ||
    !Number.isSafeInteger(pinnedUntilMs) ||
    pinnedUntilMs % SERIES_ALIGNMENT_MS !== 0 ||
    pinnedUntilMs > current.until.getTime() ||
    current.until.getTime() - pinnedUntilMs > DURATION_MS["1h"]
  ) {
    return current;
  }
  return {
    until: new Date(pinnedUntilMs),
    since: new Date(pinnedUntilMs - (current.until.getTime() - current.since.getTime())),
  };
}
