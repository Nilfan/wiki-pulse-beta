import fixture from "./fixtures/wiki-events.json";

export const LOCAL_SEED_MARKER = "wiki-pulse-local-fixture-v1";

/** Shift the entire pool by one offset, preserving all original time gaps. */
export function buildLocalSeedEvents(now = new Date(), rows = fixture) {
  if (!rows.length) throw new Error("The local seed fixture is empty");
  const timestamps = rows.map((row) => Date.parse(row.timestamp));
  if (!Number.isFinite(now.getTime()) || timestamps.some((time) => !Number.isFinite(time))) {
    throw new Error("Invalid seed timestamp");
  }
  const newest = Math.max(...timestamps);
  return rows.map((row, index) => ({
    ...row,
    timestamp: new Date(now.getTime() - (newest - timestamps[index])),
    session_id: LOCAL_SEED_MARKER,
  })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
