import { getEventsSeries, getRecentEvents, getBreakdownPage, getInsights } from "@/lib/api/data";
import {
  parseDashboardSearchParams,
  type DashboardSearchParamsInput,
} from "@/lib/queries/dashboardSearchParams";
import ExtraTablesView from "./ExtraTablesView";

type Props = {
  searchParams: Promise<DashboardSearchParamsInput>;
};

/**
 * First paint only; the overview owns subsequent filtered requests.
 */
export default async function ExtraTablesWrapper(props: Props) {
  const searchParams = parseDashboardSearchParams(await props.searchParams);
  const [insights, pages, countries, series, recent] = await Promise.all([
    getInsights(searchParams),
    getBreakdownPage("page", searchParams),
    getBreakdownPage("country", searchParams),
    getEventsSeries(searchParams),
    getRecentEvents(searchParams),
  ]);

  return (
    <ExtraTablesView
      initialInsights={insights}
      initialSeries={series}
      initialRecent={recent}
      initialPages={pages}
      initialCountries={countries}
    />
  );
}
