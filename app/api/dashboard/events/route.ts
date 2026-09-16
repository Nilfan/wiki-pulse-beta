import { NextResponse, type NextRequest } from "next/server";
import {
  getEventsSeries,
  getTimeWindow,
  toWirePoint,
  type EventsSeriesWirePoint,
} from "@/lib/queries/events";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";

export type EventsSeriesResponse = {
  events: EventsSeriesWirePoint[];
  untilMs: number;
};

/**
 * Series behind the dashboard chart, for filter changes made after the first
 * paint. The chart fetches this itself rather than letting a navigation
 * re-run the server component, because a `fetch` is something it can debounce
 * and abort — a superseded RSC request is neither, so two of them racing can
 * leave the older answer on screen.
 *
 * The expensive part still runs behind the `"use cache"` layer inside
 * `getEventsSeries`, so a repeated filter combination is cheap here.
 */
export async function GET(request: NextRequest) {
  const searchParams = parseDashboardSearchParams(
    searchParamsFromURLSearchParams(request.nextUrl.searchParams),
  );
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams.range);

  const events = await getEventsSeries(
    wikiOrgId.toString(),
    searchParams,
    timeWindow,
  );

  const body: EventsSeriesResponse = {
    events: events.map(toWirePoint),
    untilMs: timeWindow.until.getTime(),
  };

  return NextResponse.json(body);
}
