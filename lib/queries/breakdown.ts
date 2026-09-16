import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { BREAKDOWN_DIMENSIONS } from "./constants";
import {
  GROUP_BY_FILTER_PARAM,
  type DashboardFilters,
} from "./dashboardSearchParams";
import {
  DIMENSION_SQL,
  getEventFiltersSql,
  getSearchSql,
} from "./eventFilters";
import type { TimeWindow } from "./events";

export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

export type BreakdownRow = {
  value: string;
  count: number;
};

/**
 * One slice of a ranked breakdown, busiest first. Already JSON-safe, so the
 * server render and the breakdown route hand the client the same object.
 */
export type BreakdownPage = {
  rows: BreakdownRow[];
  offset: number;
  /** Every event in the window, for the share column. */
  total: number;
  /** Distinct values in the window; the list is exhausted at this length. */
  groupCount: number;
  /**
   * Upper bound the page was counted against. Later pages send it back, so an
   * infinite list keeps ranking one snapshot rather than a moving window.
   */
  untilMs: number;
};

type BreakdownQueryRow = {
  total: number;
  group_count: number;
  /** [value, count], busiest first. */
  rows: [string, number][];
};

export type BreakdownOptions = {
  offset: number;
  limit: number;
  /** Keeps only values matching this, as getSearchSql reads it. */
  search?: string;
  /**
   * Ignores the dimension's own filter, as a filter's options must: with
   * "en" picked, the country dropdown still has to offer every other country.
   */
  facet?: boolean;
};

/**
 * Only range and the value filters shape a breakdown: interval and groupBy
 * reshape the chart alone, so they stay out of the cache key.
 */
async function getBreakdownRow(
  orgId: string,
  dimension: BreakdownDimension,
  filters: DashboardFilters,
  timeWindow: TimeWindow,
  offset: number,
  limit: number,
  search: string,
): Promise<BreakdownQueryRow> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org:${orgId}`);

  const until = BigInt(timeWindow.until.getTime());
  const since = BigInt(timeWindow.since.getTime());

  // The value is the tie-breaker, so a given snapshot ranks identically on
  // every request and consecutive pages neither overlap nor skip a row.
  const [row] = await prisma.$queryRaw<BreakdownQueryRow[]>`
    WITH grouped AS (
      SELECT ${Prisma.raw(DIMENSION_SQL[dimension])} AS value, count(*)::int AS events
      FROM "Event" e
      WHERE e."org_id" = ${orgId}::bigint
        AND e."timestamp" >= to_timestamp(${since}::bigint / 1000.0) AT TIME ZONE 'UTC'
        AND e."timestamp" < to_timestamp(${until}::bigint / 1000.0) AT TIME ZONE 'UTC'
        ${getEventFiltersSql(filters)}
        ${getSearchSql(dimension, search)}
      GROUP BY 1
    )
    SELECT
      (SELECT COALESCE(sum(events), 0)::int FROM grouped) AS total,
      (SELECT count(*)::int FROM grouped) AS group_count,
      COALESCE(
        (
          SELECT json_agg(json_build_array(value, events) ORDER BY events DESC, value)
          FROM (
            SELECT value, events
            FROM grouped
            ORDER BY events DESC, value
            LIMIT ${limit} OFFSET ${offset}
          ) page
        ),
        '[]'::json
      ) AS rows
  `;

  return row;
}

export async function getBreakdownPage(
  orgId: string,
  dimension: BreakdownDimension,
  { eventType, page, country }: DashboardFilters,
  timeWindow: TimeWindow,
  { offset, limit, search = "", facet = false }: BreakdownOptions,
): Promise<BreakdownPage> {
  // Picked out field by field so nothing else from the search params reaches
  // the cache key.
  const filters = { eventType, page, country };
  if (facet) filters[GROUP_BY_FILTER_PARAM[dimension]] = [];

  const row = await getBreakdownRow(
    orgId,
    dimension,
    filters,
    timeWindow,
    offset,
    limit,
    search.trim(),
  );

  return {
    rows: row.rows.map(([value, count]) => ({ value, count })),
    offset,
    total: row.total,
    groupCount: row.group_count,
    untilMs: timeWindow.until.getTime(),
  };
}
