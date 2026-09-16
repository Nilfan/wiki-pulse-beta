export const RANGE_OPTIONS = [
  "15m",
  "1h",
  "6h",
  "12h",
  "24h",
  "2d",
  "3d",
  "7d",
  "14d",
  "21d",
  "60d",
] as const;
export const INTERVAL_OPTIONS = ["5m", "15m", "1h", "6h", "1d"] as const;
export const GROUP_BY_OPTIONS = ["event", "page", "country"] as const;

/**
 * Most values one value filter (event type, page, country) carries. Each lands
 * in an `= ANY(...)` list and in every cache key, so the URL cannot grow it
 * without bound.
 */
export const MAX_FILTER_VALUES = 50;

/**
 * Grid the upper bound of a series window is floored to. Requests landing in
 * the same slot share one bound, and therefore one cache entry.
 */
export const SERIES_ALIGNMENT_MS = 5 * 60 * 1000;

/**
 * Most series the chart draws — one per colour slot in chartSeries. Enforced
 * in SQL: groupBy=page yields tens of thousands of groups, and zero-filling
 * all of them produced responses in the hundreds of megabytes.
 */
export const MAX_SERIES = 10;

export const DURATION_MS = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "21d": 21 * 24 * 60 * 60 * 1000,
  "60d": 60 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Dimensions a breakdown can rank: the lists below the chart, and the options
 * of the value filters.
 */
export const BREAKDOWN_DIMENSIONS = GROUP_BY_OPTIONS;

/** Longest search a filter dropdown sends. */
export const MAX_FILTER_SEARCH_LENGTH = 100;

/**
 * Rows per breakdown request. Also the most rows the country pie reads, so
 * the first page is always enough to draw it.
 */
export const BREAKDOWN_PAGE_SIZE = 50;

/**
 * Cap on one breakdown request. A background refresh reloads everything the
 * list has scrolled through in one go, up to this many rows.
 */
export const BREAKDOWN_MAX_LIMIT = 500;

/** How far back a landing feed snapshot reaches. */
export const FEED_WINDOW_MS = 10 * 60 * 1000;

/** How often the landing feed asks for a fresh snapshot. */
export const FEED_REFRESH_MS = 5 * 60 * 1000;
