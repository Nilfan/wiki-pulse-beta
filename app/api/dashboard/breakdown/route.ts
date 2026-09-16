import { NextResponse, type NextRequest } from "next/server";
import * as v from "valibot";
import { getTimeWindow, type TimeWindow } from "@/lib/queries/events";
import { getBreakdownPage, type BreakdownPage } from "@/lib/queries/breakdown";
import {
  BREAKDOWN_DIMENSIONS,
  BREAKDOWN_MAX_LIMIT,
  BREAKDOWN_PAGE_SIZE,
  DURATION_MS,
  MAX_FILTER_SEARCH_LENGTH,
  SERIES_ALIGNMENT_MS,
} from "@/lib/queries/constants";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  type DashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";

export type BreakdownResponse = BreakdownPage;

/**
 * How old a pinned `until` may be. The lists refresh long before this, and the
 * bound keeps arbitrary timestamps from minting unbounded cache entries.
 */
const MAX_PINNED_AGE_MS = DURATION_MS["1h"];

const PagingSchema = v.object({
  dimension: v.picklist(BREAKDOWN_DIMENSIONS),
  offset: v.fallback(
    v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)),
    0,
  ),
  limit: v.fallback(
    v.pipe(
      v.string(),
      v.toNumber(),
      v.integer(),
      v.minValue(1),
      v.maxValue(BREAKDOWN_MAX_LIMIT),
    ),
    BREAKDOWN_PAGE_SIZE,
  ),
  until: v.fallback(
    v.optional(v.pipe(v.string(), v.toNumber(), v.integer())),
    undefined,
  ),
  q: v.fallback(
    v.pipe(
      v.string(),
      v.transform((search) => search.trim().slice(0, MAX_FILTER_SEARCH_LENGTH)),
    ),
    "",
  ),
  facet: v.fallback(
    v.pipe(
      v.string(),
      v.transform((facet) => facet === "1"),
    ),
    false,
  ),
});

/**
 * Honours the `until` a list got from its first page, so later pages rank the
 * same snapshot. Anything off the alignment grid, in the future or too old
 * falls back to the current window.
 */
function resolveTimeWindow(
  range: DashboardSearchParams["range"],
  untilMs: number | undefined,
): TimeWindow {
  const current = getTimeWindow(range);
  if (
    untilMs === undefined ||
    untilMs % SERIES_ALIGNMENT_MS !== 0 ||
    untilMs > current.until.getTime() ||
    current.until.getTime() - untilMs > MAX_PINNED_AGE_MS
  ) {
    return current;
  }

  return {
    until: new Date(untilMs),
    since: new Date(untilMs - DURATION_MS[range]),
  };
}

/**
 * One page of a breakdown: a list below the chart, or — with `facet=1` and
 * an optional `q` — the options of a value filter. Same split as the insights
 * route: the callers fetch for themselves so a request can be debounced and
 * aborted.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const paging = v.safeParse(PagingSchema, {
    dimension: query.get("dimension") ?? undefined,
    offset: query.get("offset") ?? undefined,
    limit: query.get("limit") ?? undefined,
    until: query.get("until") ?? undefined,
    q: query.get("q") ?? undefined,
    facet: query.get("facet") ?? undefined,
  });
  if (!paging.success) {
    return NextResponse.json({ error: "Unknown dimension" }, { status: 400 });
  }

  const { dimension, offset, limit, until, q, facet } = paging.output;
  const searchParams = parseDashboardSearchParams(
    searchParamsFromURLSearchParams(query),
  );
  const wikiOrgId = await getWikiOrgId();

  const body: BreakdownResponse = await getBreakdownPage(
    wikiOrgId.toString(),
    dimension,
    searchParams,
    resolveTimeWindow(searchParams.range, until),
    { offset, limit, search: q, facet },
  );

  return NextResponse.json(body);
}
