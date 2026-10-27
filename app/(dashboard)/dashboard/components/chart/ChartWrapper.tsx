import { getEventsSeries } from "@/lib/api/data";
import {
  parseDashboardSearchParams,
  type DashboardSearchParamsInput,
} from "@/lib/queries/dashboardSearchParams";
import Chart from "./Chart";

type Props = {
  searchParams: Promise<DashboardSearchParamsInput>;
};

/**
 * First paint only. Filter changes after this are fetched by the chart itself
 * (see useEventsSeries), so this runs on a full page load rather than on
 * every click.
 */
export default async function ChartWrapper(props: Props) {
  const searchParams = parseDashboardSearchParams(await props.searchParams);
  const series = await getEventsSeries(searchParams);

  return <Chart initialSeries={series} />;
}
