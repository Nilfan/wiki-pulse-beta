import assert from "node:assert/strict";
import { test } from "node:test";
import { getDraggedPeriod } from "./draggedPeriod";

const since = Date.parse("2026-10-15T00:00:00.000Z");
const hour = 3600000;
const until = since + 24 * hour;

test("dragging either direction includes both selected buckets", () => {
  const expected = {
    start: new Date(since + 4 * hour).toISOString(),
    end: new Date(since + 10 * hour).toISOString(),
  };
  assert.deepEqual(getDraggedPeriod(since + 4 * hour, since + 9 * hour, hour, since, until), expected);
  assert.deepEqual(getDraggedPeriod(since + 9 * hour, since + 4 * hour, hour, since, until), expected);
});

test("selection clips the partial first bucket and never exceeds the displayed end", () => {
  const customSince = since + 15 * 60000;
  assert.deepEqual(getDraggedPeriod(since, until - hour, hour, customSince, until), {
    start: new Date(customSince).toISOString(), end: new Date(until).toISOString(),
  });
});

test("a deliberate drag within one bucket selects that bucket", () => {
  assert.deepEqual(getDraggedPeriod(since + hour, since + hour, hour, since, until), {
    start: new Date(since + hour).toISOString(), end: new Date(since + 2 * hour).toISOString(),
  });
});

test("invalid, empty or oversized selections cannot produce a custom range", () => {
  assert.equal(getDraggedPeriod(NaN, since, hour, since, until), null);
  assert.equal(getDraggedPeriod(since, since, 0, since, until), null);
  assert.equal(getDraggedPeriod(until, until, hour, since, until), null);
  assert.equal(getDraggedPeriod(since, since + 90 * 24 * hour, hour, since, since + 91 * 24 * hour), null);
});
