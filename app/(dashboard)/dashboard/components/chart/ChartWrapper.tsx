import {
  getEventsSeries,
  getTimeWindow,
  toWirePoint,
} from "@/lib/queries/events";
import {
  parseDashboardSearchParams,
  type DashboardSearchParamsInput,
} from "@/lib/queries/dashboardSearchParams";
import { getWikiOrgId } from "@/lib/queries/organizations";
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
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams.range);

  // TODO: Check if I really need it
  const events = await getEventsSeries(
    wikiOrgId.toString(),
    searchParams,
    timeWindow,
  );

  return (
    <Chart
      initialEvents={events.map(toWirePoint)}
      initialUntilMs={timeWindow.until.getTime()}
    />
  );
}
