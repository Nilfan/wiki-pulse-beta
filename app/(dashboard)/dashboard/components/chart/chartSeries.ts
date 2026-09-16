import { MAX_SERIES } from "@/lib/queries/constants";
import type {
  DashboardGroupBy,
  EventsSeriesWirePoint,
} from "@/lib/queries/events";
import { WIKI_LANGUAGE_NAMES } from "@/lib/labels/wikiLanguageNames";

export const CHART_TYPES = ["line", "area", "bar", "stacked"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

/**
 * Categorical slots, handed out in this fixed order and never cycled — the
 * order is what keeps neighbouring series apart, so it is not cosmetic.
 *
 * Validated as a set against the white card surface (OKLab ΔE ×100, adjacent
 * pairs): worst CVD pair 9.2 under protanopia/deuteranopia (≥8 target), worst
 * normal-vision pair 23.5 (≥15 floor), every slot inside the L 0.43–0.77 band
 * and over the 0.10 chroma floor. Slot 1 is the nearest in-band step to the
 * brand red; the original --color-dash-event-* ramp could not be used as-is
 * (three of its steps read as grey, and its worst pair sat at ΔE 5.8).
 *
 * Yellow, aqua and magenta sit under 3:1 against white. That is allowed only
 * because identity never rests on colour here: every series is named in the
 * legend and its exact value is in the hover tooltip.
 */
export const SERIES_COLORS = [
  "#a82838",
  "#4a3aa7",
  "#eda100",
  "#0e8ea3",
  "#a8541b",
  "#1baf7a",
  "#eb6834",
  "#2a78d6",
  "#e87ba4",
  "#008300",
] as const;

/**
 * Drawn series are capped at one per colour slot (MAX_SERIES, applied in SQL
 * by getEventsSeries): groupBy=page can produce thousands of groups, and every
 * one would become its own SVG path. The quietest groups past the cap are
 * dropped rather than folded into an "other" line — a catch-all built from a
 * long tail outranks the real series it sits beside and reads as something it
 * is not. ChartLegend says how many went.
 */

/** Key used when no groupBy is active and the chart draws a single series. */
export const TOTAL_SERIES_KEY = "events";

const GROUP_VALUE_SEPARATOR = " · ";

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type ChartRow = {
  timestamp: number;
} & Record<string, number>;

export type ChartData = {
  rows: ChartRow[];
  series: ChartSeries[];
  /** Series the cap left undrawn, for the legend's warning. */
  droppedSeriesCount: number;
};

function getSeriesKey(
  point: EventsSeriesWirePoint,
  groupBy: readonly DashboardGroupBy[],
) {
  if (!groupBy.length) return TOTAL_SERIES_KEY;

  return groupBy
    .map((dimension) => point.group[dimension] || "unknown")
    .join(GROUP_VALUE_SEPARATOR);
}

const WIKI_DOMAIN = "/wiki/";

/** Paths are stored percent-encoded; a malformed one is shown as stored. */
export function decodePath(path: string) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** "ru" → "Russian Federation (ru)"; unrecognised codes are left as-is. */
export function formatGroupValue(dimension: DashboardGroupBy, value: string) {
  if (dimension === "page") {
    const noWikiDomain = value.startsWith(WIKI_DOMAIN)
      ? value.replace(WIKI_DOMAIN, "")
      : value;

    return decodePath(noWikiDomain);
  }

  if (dimension === "country") {
    const code = value.toLowerCase();
    // A wiki language edition, not a country: "ar" is Arabic, not Argentina.
    const name = WIKI_LANGUAGE_NAMES[code];
    return name ? `${name} (${value})` : value;
  }

  return value;
}

function getSeriesLabel(
  point: EventsSeriesWirePoint,
  groupBy: readonly DashboardGroupBy[],
) {
  if (!groupBy.length) return TOTAL_SERIES_KEY;

  return groupBy
    .map((dimension) =>
      formatGroupValue(dimension, point.group[dimension] || "unknown"),
    )
    .join(GROUP_VALUE_SEPARATOR);
}

/**
 * Turns the long series (one row per bucket per group) into the wide rows
 * recharts wants (one row per bucket, one column per series).
 */
export function buildChartData(
  events: readonly EventsSeriesWirePoint[],
  groupBy: readonly DashboardGroupBy[],
  /** Groups in the window before the server's cap, from getEventsSeries. */
  groupCount: number,
): ChartData {
  const totalsByKey = new Map<string, number>();
  const labelsByKey = new Map<string, string>();
  for (const point of events) {
    const key = getSeriesKey(point, groupBy);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + point.count);
    if (!labelsByKey.has(key)) {
      labelsByKey.set(key, getSeriesLabel(point, groupBy));
    }
  }

  const rankedKeys = [...totalsByKey].sort(
    ([, left], [, right]) => right - left,
  );
  const drawnKeys = rankedKeys.slice(0, MAX_SERIES).map(([key]) => key);
  const droppedSeriesCount = Math.max(0, groupCount - drawnKeys.length);
  const drawnKeySet = new Set(drawnKeys);

  const rowsByTimestamp = new Map<number, ChartRow>();
  for (const point of events) {
    let row = rowsByTimestamp.get(point.timestamp);
    if (!row) {
      // Built for every bucket in the data, even one whose only groups were
      // dropped — otherwise the time axis would lose that bucket entirely.
      // Each drawn series gets an explicit zero so stacking and area fills do
      // not punch holes where a group happened to be absent.
      row = { timestamp: point.timestamp } as ChartRow;
      for (const key of drawnKeys) row[key] = 0;
      rowsByTimestamp.set(point.timestamp, row);
    }

    const key = getSeriesKey(point, groupBy);
    if (drawnKeySet.has(key)) row[key] += point.count;
  }

  const rows = [...rowsByTimestamp.values()].sort(
    (left, right) => left.timestamp - right.timestamp,
  );

  const series = drawnKeys.map((key, index) => ({
    key,
    label: labelsByKey.get(key) ?? key,
    color: SERIES_COLORS[index],
  }));

  return { rows, series, droppedSeriesCount };
}
