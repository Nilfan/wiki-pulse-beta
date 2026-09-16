import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { DURATION_MS, MAX_SERIES, SERIES_ALIGNMENT_MS } from "./constants";
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

export type EventsSeries = {
  /** Zero-filled points for the {@link MAX_SERIES} busiest groups only. */
  points: EventsSeriesPoint[];
  /** Every event in the window, including groups left out of `points`. */
  total: number;
  /** Groups in the window before the cap; 1 when nothing is grouped. */
  groupCount: number;
};

/** What the chart receives, from the server render and the events route. */
export type EventsSeriesWire = {
  events: EventsSeriesWirePoint[];
  total: number;
  groupCount: number;
  untilMs: number;
};

export function toEventsSeriesWire(
  series: EventsSeries,
  timeWindow: TimeWindow,
): EventsSeriesWire {
  return {
    events: series.points.map(toWirePoint),
    total: series.total,
    groupCount: series.groupCount,
    untilMs: timeWindow.until.getTime(),
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

type EventsSeriesBuckets = {
  rows: EventsSeriesRow[];
  total: number;
  groupCount: number;
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
 * result.
 *
 * Only the {@link MAX_SERIES} busiest groups come back — the chart could not
 * draw the rest anyway, and shipping them is what used to blow up: groupBy=page
 * over 24h zero-filled to ~250MB of JSON, and over 7d past V8's string limit.
 * The window total and the group count are computed before the cut, so the
 * headline figure and the legend's "n more" stay exact.
 */
async function getEventsSeriesBuckets(
  orgId: string,
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): Promise<EventsSeriesBuckets> {
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
    Prisma.raw(`"g_${groupBy}"`),
  );
  const groupObjectArgs = params.groupBy.map((groupBy) =>
    Prisma.raw(`'${groupBy}', c."g_${groupBy}"`),
  );
  const groupColumnList = hasGroups
    ? Prisma.join(groupColumns, ", ")
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    (EventsSeriesRow & { total: number; group_count: number })[]
  >`
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
    ),
    counted AS (
      SELECT bucket_ms${hasGroups ? Prisma.sql`, ${groupColumnList}` : Prisma.empty}, count(*)::int AS "count"
      FROM bucketed
      GROUP BY bucket_ms${hasGroups ? Prisma.sql`, ${groupColumnList}` : Prisma.empty}
    ),
    group_totals AS (
      SELECT ${hasGroups ? Prisma.sql`${groupColumnList}, ` : Prisma.empty}sum("count") AS total
      FROM counted
      ${hasGroups ? Prisma.sql`GROUP BY ${groupColumnList}` : Prisma.empty}
    )
    ${
      hasGroups
        ? Prisma.sql`, top_groups AS (
            SELECT ${groupColumnList}
            FROM group_totals
            ORDER BY total DESC, ${groupColumnList}
            LIMIT ${MAX_SERIES}
          )`
        : Prisma.empty
    }
    SELECT
      to_timestamp(c.bucket_ms::double precision / 1000) AS "timestamp",
      json_build_object(${hasGroups ? Prisma.join(groupObjectArgs, ", ") : Prisma.empty}) AS "group",
      c."count",
      (SELECT COALESCE(sum(total), 0)::int FROM group_totals) AS total,
      (SELECT count(*)::int FROM group_totals) AS group_count
    FROM counted c
    ${hasGroups ? Prisma.sql`JOIN top_groups USING (${groupColumnList})` : Prisma.empty}
  `;

  return {
    rows,
    // Repeated on every row; an empty window has no rows and nothing to count.
    total: rows[0]?.total ?? 0,
    groupCount: rows[0]?.group_count ?? 0,
  };
}

export async function getEventsSeries(
  orgId: string,
  params: DashboardSearchParams,
  timeWindow: TimeWindow,
): Promise<EventsSeries> {
  const { rows, total, groupCount } = await getEventsSeriesBuckets(
    orgId,
    params,
    timeWindow,
  );

  return {
    points: fillEmptyBuckets(rows, params, timeWindow),
    total,
    groupCount,
  };
}
