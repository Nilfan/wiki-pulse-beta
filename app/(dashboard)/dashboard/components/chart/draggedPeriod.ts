import { getCustomPeriodError } from "@/lib/queries/timeWindow";

/** Include both selected buckets, clipped to the window actually on screen. */
export function getDraggedPeriod(
  from: number,
  to: number,
  intervalMs: number,
  sinceMs: number,
  untilMs: number,
): { start: string; end: string } | null {
  if (![from, to, intervalMs, sinceMs, untilMs].every(Number.isFinite) || intervalMs <= 0) return null;
  const startMs = Math.max(sinceMs, Math.min(from, to));
  const endMs = Math.min(untilMs, Math.max(from, to) + intervalMs);
  if (startMs >= endMs) return null;
  const start = new Date(startMs).toISOString();
  const end = new Date(endMs).toISOString();
  return getCustomPeriodError(start, end) ? null : { start, end };
}
