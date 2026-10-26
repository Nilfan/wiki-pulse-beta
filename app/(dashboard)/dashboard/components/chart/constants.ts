/**
 * How long the filters have to hold still before a request goes out. Long
 * enough to swallow a burst of clicks through a filter menu, short enough
 * that a single deliberate change still feels immediate.
 */
export const DEBOUNCE_MS = 350;

export const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * How often the series on screen is refetched in the background so the chart
 * keeps up with newly collected events without a page reload.
 */
export const REFRESH_INTERVAL_MINUTES = 5;
