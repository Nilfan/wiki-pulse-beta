import { DURATION_MS } from "@/lib/queries/constants";
import type { DashboardSearchParams } from "@/lib/queries/events";
import type { ChartRow, ChartSeries, ChartType } from "./chartSeries";

/** How many labels the time axis carries, endpoints included. */
const X_TICK_COUNT = 6;

/** Ticks on the value axis: zero, midpoint, top. */
const Y_TICK_COUNT = 3;

/** Above this window the time of day stops being a useful label on its own. */
const DATE_LABEL_FROM_MS = DURATION_MS["7d"];

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export function formatTotal(total: number) {
  return total.toLocaleString("en-US");
}

/** 0.1694 → "16.9%". */
export function formatShare(share: number) {
  return `${(share * 100).toFixed(1)}%`;
}

/** 0 → "0", 250 → "250", 2000 → "2k", 2500 → "2.5k", 1_200_000 → "1.2M". */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimZero(value / 1_000)}k`;
  return String(value);
}

function trimZero(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function getTimeFormatter(range: DashboardSearchParams["range"]) {
  const formatter =
    DURATION_MS[range] > DATE_LABEL_FROM_MS ? DATE_FORMATTER : TIME_FORMATTER;

  return (timestamp: number) => formatter.format(new Date(timestamp));
}

/**
 * Rounds up to the next 1/2/2.5/5 × 10ⁿ so the axis top divides cleanly by the
 * tick count and reads as a round number (500, 2k, 25k …).
 */
function getNiceCeiling(value: number) {
  if (value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

/**
 * Peak of the drawn chart: the tallest single series, or — once the series are
 * stacked on top of each other — the tallest bucket total.
 */
function getPeak(
  rows: readonly ChartRow[],
  series: readonly ChartSeries[],
  chartType: ChartType,
) {
  let peak = 0;
  for (const row of rows) {
    if (chartType === "stacked") {
      let rowTotal = 0;
      for (const { key } of series) rowTotal += row[key] ?? 0;
      peak = Math.max(peak, rowTotal);
      continue;
    }

    for (const { key } of series) peak = Math.max(peak, row[key] ?? 0);
  }

  return peak;
}

export function getValueTicks(
  rows: readonly ChartRow[],
  series: readonly ChartSeries[],
  chartType: ChartType,
) {
  const top = getNiceCeiling(getPeak(rows, series, chartType));
  const step = top / (Y_TICK_COUNT - 1);

  return Array.from({ length: Y_TICK_COUNT }, (_, index) =>
    Math.round(index * step),
  );
}

/**
 * Evenly spaced bucket timestamps, both ends included, so the first and last
 * label sit flush with the axis.
 */
export function getTimeTicks(rows: readonly ChartRow[]) {
  if (rows.length <= X_TICK_COUNT) return rows.map((row) => row.timestamp);

  const lastIndex = rows.length - 1;

  return Array.from(
    { length: X_TICK_COUNT },
    (_, index) =>
      rows[Math.round((index * lastIndex) / (X_TICK_COUNT - 1))].timestamp,
  );
}

const RANGE_LABELS: Record<DashboardSearchParams["range"], string> = {
  "15m": "last 15 minutes",
  "1h": "last hour",
  "6h": "last 6 hours",
  "12h": "last 12 hours",
  "24h": "last 24 hours",
  "2d": "last 2 days",
  "3d": "last 3 days",
  "7d": "last 7 days",
  "14d": "last 14 days",
  "21d": "last 21 days",
  "60d": "last 60 days",
};

export function getRangeLabel(range: DashboardSearchParams["range"]) {
  return RANGE_LABELS[range];
}
