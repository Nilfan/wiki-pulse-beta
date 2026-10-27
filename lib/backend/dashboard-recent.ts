import { NextResponse, type NextRequest } from "next/server";
import { eventsCsv } from "@/lib/helpers/events-csv";
import { parseDashboardSearchParams, searchParamsFromURLSearchParams } from "@/lib/queries/dashboardSearchParams";
import { getTimeWindow } from "@/lib/queries/events";
import { getWikiOrgId } from "@/lib/queries/organizations";
import { CSV_EVENTS_LIMIT, getRecentEvents, RECENT_EVENTS_LIMIT } from "@/lib/queries/recentEvents";

export async function GET(request: NextRequest) {
  const params = parseDashboardSearchParams(searchParamsFromURLSearchParams(request.nextUrl.searchParams));
  const csv = request.nextUrl.searchParams.get("format") === "csv";
  const timeZone = request.nextUrl.searchParams.get("timeZone") ?? undefined;
  if (csv && timeZone !== undefined) {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone }).format(0);
    } catch {
      return NextResponse.json({ error: "Invalid timeZone" }, { status: 400 });
    }
  }
  const orgId = await getWikiOrgId();
  const events = await getRecentEvents(orgId.toString(), params, getTimeWindow(params), csv ? CSV_EVENTS_LIMIT : RECENT_EVENTS_LIMIT);
  if (csv) return new Response(eventsCsv(events, timeZone), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="wikipulse-events.csv"', "X-Export-Limit": String(CSV_EVENTS_LIMIT) } });
  return NextResponse.json(events);
}
