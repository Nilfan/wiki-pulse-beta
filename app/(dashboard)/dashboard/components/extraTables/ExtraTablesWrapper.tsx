import { getTimeWindow } from "@/lib/queries/events";
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

/** First paint only; later filter changes are fetched by useInsights. */
export default async function ExtraTablesWrapper(props: Props) {
  const searchParams = parseDashboardSearchParams(await props.searchParams);
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams.range);

  const insights = await getInsights(
    wikiOrgId.toString(),
    searchParams,
    timeWindow,
  );

  return <ExtraTablesView initialInsights={insights} />;
}
