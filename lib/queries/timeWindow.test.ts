import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardFilters,
  serializeDashboardSearchParams,
} from "./dashboardSearchParams";
import { DURATION_MS, RANGE_OPTIONS, SERIES_ALIGNMENT_MS } from "./constants";
import { getCustomPeriodError, getTimeWindow, resolveBreakdownTimeWindow } from "./timeWindow";

const start = "2026-10-01T08:12:34.123Z";
const end = "2026-10-02T16:47:56.789Z";
const custom = parseDashboardSearchParams({ range: "custom", start, end, interval: "1h", eventType: ["edit"], groupBy: ["country"] });
const now = Date.parse("2026-10-15T12:34:56.000Z");

test("custom periods round-trip through chart and faceted breakdown query strings", () => {
  const query = serializeDashboardSearchParams(custom);
  assert.deepEqual(parseDashboardSearchParams(searchParamsFromURLSearchParams(new URLSearchParams(query))), custom);
  const facetQuery = new URLSearchParams(serializeDashboardFilters(custom));
  assert.equal(facetQuery.get("start"), start);
  assert.equal(facetQuery.get("end"), end);
  assert.equal(facetQuery.get("eventType"), "edit");
  assert.equal(facetQuery.has("interval"), false);
  assert.notEqual(serializeDashboardFilters(custom), serializeDashboardFilters({ ...custom, start: "2026-10-01T08:12:35.123Z" }));
});

test("custom endpoints remain exact across refreshes, including sub-grid seconds", () => {
  const window = getTimeWindow(custom, now);
  assert.equal(window.since.toISOString(), start);
  assert.equal(window.until.toISOString(), end);
  assert.deepEqual(getTimeWindow(custom, now + DURATION_MS["1d"]), window);
});

test("breakdown paging cannot shift a custom period, even with an old or forged pin", () => {
  const window = getTimeWindow(custom, now);
  for (const pin of [undefined, Date.parse(end), now, 0, NaN]) {
    assert.deepEqual(resolveBreakdownTimeWindow(custom, pin, now), window);
  }
});

test("invalid custom URLs fall back to the existing 24-hour range", () => {
  for (const bounds of [
    {}, { start }, { end }, { start: "invalid", end }, { start, end: "invalid" },
    { start, end: start }, { start: end, end: start },
    { start: "2026-02-30T00:00:00.000Z", end: "2026-03-04T00:00:00.000Z" },
    { start, end: "2027-01-01T00:00:00.000Z" },
    { start: [start, start], end },
  ]) {
    const parsed = parseDashboardSearchParams({ range: "custom", ...bounds });
    assert.equal(parsed.range, "24h");
    assert.equal(parsed.start, undefined);
    assert.equal(parsed.end, undefined);
  }
});

test("custom validation accepts the 60-day boundary and rejects even one millisecond more", () => {
  const from = Date.parse(start);
  assert.equal(getCustomPeriodError(start, new Date(from + DURATION_MS["60d"]).toISOString()), null);
  assert.match(getCustomPeriodError(start, new Date(from + DURATION_MS["60d"] + 1).toISOString())!, /60 days/);
  assert.match(getCustomPeriodError(start, start)!, /after start/);
  assert.match(getCustomPeriodError(undefined, end)!, /both/);
});

test("all preset windows keep cache alignment and ignore stale custom endpoints", () => {
  for (const range of RANGE_OPTIONS) {
    const parsed = parseDashboardSearchParams({ range, start, end });
    const window = getTimeWindow(parsed, now);
    assert.equal(window.until.getTime() % SERIES_ALIGNMENT_MS, 0);
    assert.equal(window.until.getTime() - window.since.getTime(), DURATION_MS[range]);
    assert.equal(new URLSearchParams(serializeDashboardSearchParams(parsed)).has("start"), false);
  }
});

test("relative breakdowns keep valid snapshot pins and reject stale, future or off-grid pins", () => {
  const params = parseDashboardSearchParams({ range: "7d" });
  const current = getTimeWindow(params, now);
  const pin = current.until.getTime() - SERIES_ALIGNMENT_MS;
  const pinned = resolveBreakdownTimeWindow(params, pin, now);
  assert.equal(pinned.until.getTime(), pin);
  assert.equal(pinned.since.getTime(), pin - DURATION_MS["7d"]);
  for (const invalidPin of [pin + 1, current.until.getTime() + SERIES_ALIGNMENT_MS, pin - DURATION_MS["1h"], NaN]) {
    assert.deepEqual(resolveBreakdownTimeWindow(params, invalidPin, now), current);
  }
});
