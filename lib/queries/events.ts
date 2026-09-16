import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { DURATION_MS, SERIES_ALIGNMENT_MS } from "./constants";
import type {
  DashboardGroupBy,
  DashboardSearchParams,
} from "./dashboardSearchParams";
import { cacheLife, cacheTag } from "next/cache";

// Re-exported so server-side callers can keep reaching for the whole events
// API from one module. Client components must import these from
// ./dashboardSearchParams directly — importing them from here would drag
// Prisma into the browser bundle.
export {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardSearchParams,
} from "./dashboardSearchParams";
export type {
  DashboardGroupBy,
  DashboardSearchParams,
  DashboardSearchParamsInput,
} from "./dashboardSearchParams";

export type EventsSeriesPoint = {
  timestamp: Date;
  count: number;
  group: Partial<Record<DashboardGroupBy, string>>;
};

/**
 * Wire form of {@link EventsSeriesPoint}: timestamps as epoch milliseconds,
 * which survive JSON. Both the initial server render and the events API route
 * hand the chart this shape, so the client has one representation to draw
 * from regardless of where a series came from.
 */
export type EventsSeriesWirePoint = {
  timestamp: number;
  count: number;
  group: EventsSeriesPoint["group"];
};

export function toWirePoint(point: EventsSeriesPoint): EventsSeriesWirePoint {
  return {
    timestamp: point.timestamp.getTime(),
    count: point.count,
    group: point.group,
  };
}

export type TimeWindow = {
  since: Date;
  until: Date;
};

/**
 * Must be called outside of any cached scope: both bounds become part of the
 * getEventsSeries cache key, whereas a `Date.now()` inside "use cache" would
 * freeze at the moment the entry was filled.
 *
 * `until` is floored to SERIES_ALIGNMENT_MS so every request landing in the
 * same slot produces the same key. getEventsSeries then hangs its bucket grid
 * off that bound, which keeps the grid aligned for any interval.
 */
export function getTimeWindow(
  range: DashboardSearchParams["range"],
): TimeWindow {
  const untilMs =
    Math.floor(Date.now() / SERIES_ALIGNMENT_MS) * SERIES_ALIGNMENT_MS;

  return {
    until: new Date(untilMs),
    since: new Date(untilMs - DURATION_MS[range]),
  };
}

export async function getEventTypes(orgId: bigint): Promise<string[]> {
  const eventTypes = await prisma.event.findMany({
    where: { org_id: orgId },
    distinct: ["type"],
    select: { type: true },
    orderBy: { type: "asc" },
  });

  return eventTypes.map(({ type }) => type);
}

/**
 * SQL for each groupBy dimension, keyed by the validated picklist value so the
 * fragments below are never built from user input.
 */
const GROUP_BY_SQL: Record<DashboardGroupBy, string> = {
  event: 'e."type"',
  page: 'e."path"',
  country: `COALESCE(e."country", 'unknown')`,
};

type EventsSeriesRow = {
  timestamp: Date;
  group: EventsSeriesPoint["group"];
  count: number;
};

/** Separators for the composite Map keys used while filling empty buckets. */
const GROUP_KEY_SEPARATOR = "\u0000";
const BUCKET_KEY_SEPARATOR = "\u0001";

/**
 * Start of every bucket in the window, ascending.
 *
 * Buckets are laid out backwards from `until` rather than from the epoch, so
 * that the trailing bucket always closes exactly on the window bound and is
 * therefore fully filled, whatever the interval. The SQL below derives its own
 * bucket from the same `until` and interval, which keeps the two aligned.
 */
export function getBucketStarts(
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): number[] {
  const untilMs = timeWindow.until.getTime();
  const intervalMs = DURATION_MS[params.interval];
  const bucketCount = Math.ceil(
    (untilMs - timeWindow.since.getTime()) / intervalMs,
  );

  const bucketStarts: number[] = [];
  for (let index = bucketCount; index >= 1; index--) {
    bucketStarts.push(untilMs - index * intervalMs);
  }

  return bucketStarts;
}

/**
 * Postgres returns only the buckets that actually hold events. The zero-filled
 * grid is rebuilt here instead of in SQL because the zeros dominate the result
 * — for a high-cardinality groupBy the dense grid is two orders of magnitude
 * larger than the sparse one, and shipping it costs far more than recreating
 * it (measured: 5.4s vs 0.4s for groupBy=page over 24h).
 *
 * The set of series is taken from the data, so a window with no events at all
 * and a non-empty groupBy yields nothing: there is no way to know which groups
 * should have been drawn as zero.
 */
function fillEmptyBuckets(
  rows: EventsSeriesRow[],
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): EventsSeriesPoint[] {
  const bucketStarts = getBucketStarts(params, timeWindow);

  if (!params.groupBy.length) {
    const counts = new Map<number, number>();
    for (const row of rows) counts.set(row.timestamp.getTime(), row.count);

    return bucketStarts.map((bucketStart) => ({
      timestamp: new Date(bucketStart),
      count: counts.get(bucketStart) ?? 0,
      group: {},
    }));
  }

  const groups = new Map<string, EventsSeriesPoint["group"]>();
  const counts = new Map<string, number>();
  for (const row of rows) {
    const groupKey = params.groupBy
      .map((groupBy) => row.group[groupBy])
      .join(GROUP_KEY_SEPARATOR);

    if (!groups.has(groupKey)) groups.set(groupKey, row.group);
    counts.set(
      `${row.timestamp.getTime()}${BUCKET_KEY_SEPARATOR}${groupKey}`,
      row.count,
    );
  }

  // Ordered by group key so the series keep the stable order the SQL used to
  // produce, which React relies on for keys.
  const sortedGroups = [...groups].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  const series: EventsSeriesPoint[] = [];
  for (const bucketStart of bucketStarts) {
    const timestamp = new Date(bucketStart);

    for (const [groupKey, group] of sortedGroups) {
      series.push({
        timestamp,
        count:
          counts.get(`${bucketStart}${BUCKET_KEY_SEPARATOR}${groupKey}`) ?? 0,
        group,
      });
    }
  }

  return series;
}

/**
 * Cached separately from the zero-filling so the cache entry holds the sparse
 * result: for groupBy=page over 24h that is ~8.7k rows instead of ~190k.
 */
async function getEventsSeriesBuckets(
  orgId: string,
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): Promise<EventsSeriesRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org:${orgId}`);

  // Bounds travel as epoch milliseconds and are turned back into UTC-naive
  // timestamps in SQL, which keeps the event filter on the raw column (and so
  // on the org_id/timestamp index) and independent of the session time zone.
  const until = BigInt(timeWindow.until.getTime());
  const since = BigInt(timeWindow.since.getTime());
  const interval = BigInt(DURATION_MS[params.interval]);

  const hasGroups = params.groupBy.length > 0;
  const bucketedColumns = params.groupBy.map((groupBy) =>
    Prisma.raw(`${GROUP_BY_SQL[groupBy]} AS "g_${groupBy}"`),
  );
  const groupColumns = params.groupBy.map((groupBy) =>
    Prisma.raw(`b."g_${groupBy}"`),
  );
  const groupObjectArgs = params.groupBy.map((groupBy) =>
    Prisma.raw(`'${groupBy}', b."g_${groupBy}"`),
  );

  return prisma.$queryRaw<EventsSeriesRow[]>`
    WITH bucketed AS (
      SELECT
        ${until}::bigint - ceil(
          (${until}::bigint - (extract(epoch FROM e."timestamp") * 1000)::bigint)::numeric
            / ${interval}::numeric
        )::bigint * ${interval}::bigint AS bucket_ms
        ${hasGroups ? Prisma.sql`, ${Prisma.join(bucketedColumns, ", ")}` : Prisma.empty}
      FROM "Event" e
      WHERE e."org_id" = ${orgId}::bigint
        AND e."timestamp" >= to_timestamp(${since}::bigint / 1000.0) AT TIME ZONE 'UTC'
        AND e."timestamp" < to_timestamp(${until}::bigint / 1000.0) AT TIME ZONE 'UTC'
        ${params.eventType.length ? Prisma.sql`AND e."type" = ANY(${params.eventType}::text[])` : Prisma.empty}
    )
    SELECT
      to_timestamp(b.bucket_ms::double precision / 1000) AS "timestamp",
      json_build_object(${hasGroups ? Prisma.join(groupObjectArgs, ", ") : Prisma.empty}) AS "group",
      count(*)::int AS "count"
    FROM bucketed b
    GROUP BY b.bucket_ms${hasGroups ? Prisma.sql`, ${Prisma.join(groupColumns, ", ")}` : Prisma.empty}
  `;
}

export async function getEventsSeries(
  orgId: string,
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): Promise<EventsSeriesPoint[]> {
  const rows = await getEventsSeriesBuckets(orgId, params, timeWindow);

  return fillEmptyBuckets(rows, params, timeWindow);
}
