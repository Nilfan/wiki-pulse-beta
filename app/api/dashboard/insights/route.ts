import { NextResponse, type NextRequest } from "next/server";
import { getTimeWindow } from "@/lib/queries/events";
import { getInsights, type Insights } from "@/lib/queries/insights";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";

export type InsightsResponse = Insights;

/**
 * Insights strip for filter changes made after the first paint — the same
 * split as the events route, for the same reason: a `fetch` can be debounced
 * and aborted, a navigation cannot.
 */
export async function GET(request: NextRequest) {
  const searchParams = parseDashboardSearchParams(
    searchParamsFromURLSearchParams(request.nextUrl.searchParams),
  );
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams.range);

  const body: InsightsResponse = await getInsights(
    wikiOrgId.toString(),
    searchParams,
    timeWindow,
  );

  return NextResponse.json(body);
}
