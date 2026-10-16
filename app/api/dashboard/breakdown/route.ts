import { NextResponse, type NextRequest } from "next/server";
import * as v from "valibot";
import { resolveBreakdownTimeWindow } from "@/lib/queries/timeWindow";
import { getBreakdownPage, type BreakdownPage } from "@/lib/queries/breakdown";
import {
  BREAKDOWN_DIMENSIONS,
  BREAKDOWN_MAX_LIMIT,
  BREAKDOWN_PAGE_SIZE,
  MAX_FILTER_SEARCH_LENGTH,
} from "@/lib/queries/constants";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";

export type BreakdownResponse = BreakdownPage;

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
    resolveBreakdownTimeWindow(searchParams, until),
    { offset, limit, search: q, facet },
  );

  return NextResponse.json(body);
}
