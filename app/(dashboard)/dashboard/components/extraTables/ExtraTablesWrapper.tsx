import { getEventsSeries, getTimeWindow, toEventsSeriesWire } from "@/lib/queries/events";
import { getRecentEvents } from "@/lib/queries/recentEvents";
import { getBreakdownPage } from "@/lib/queries/breakdown";
import { BREAKDOWN_PAGE_SIZE } from "@/lib/queries/constants";
import { getInsights } from "@/lib/queries/insights";
import {
  parseDashboardSearchParams,
  type DashboardSearchParamsInput,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";
import ExtraTablesView from "./ExtraTablesView";

type Props = {
  searchParams: Promise<DashboardSearchParamsInput>;
};

/**
 * First paint only; the overview owns subsequent filtered requests.
 */
export default async function ExtraTablesWrapper(props: Props) {
  const searchParams = parseDashboardSearchParams(await props.searchParams);
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams);

  const orgId = wikiOrgId.toString();

  const [insights, pages, countries, series, recent] = await Promise.all([
    getInsights(orgId, searchParams, timeWindow),
    getBreakdownPage(orgId, "page", searchParams, timeWindow, {
      offset: 0,
      limit: BREAKDOWN_PAGE_SIZE,
      facet: true,
    }),
    getBreakdownPage(orgId, "country", searchParams, timeWindow, {
      offset: 0,
      limit: BREAKDOWN_PAGE_SIZE,
      facet: true,
    }),
    getEventsSeries(orgId, searchParams, timeWindow),
    getRecentEvents(orgId, searchParams, timeWindow),
  ]);

  return (
    <ExtraTablesView
      initialInsights={insights}
      initialSeries={toEventsSeriesWire(series, timeWindow)}
      initialRecent={recent}
      initialPages={pages}
      initialCountries={countries}
    />
  );
}
