import { getTimeWindow } from "@/lib/queries/events";
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
 * First paint only; later filter changes are fetched by useInsights and
 * useBreakdown.
 */
export default async function ExtraTablesWrapper(props: Props) {
  const searchParams = parseDashboardSearchParams(await props.searchParams);
  const wikiOrgId = await getWikiOrgId();
  const timeWindow = getTimeWindow(searchParams.range);

  const orgId = wikiOrgId.toString();

  const [insights, pages, countries] = await Promise.all([
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
  ]);

  return (
    <ExtraTablesView
      initialInsights={insights}
      initialPages={pages}
      initialCountries={countries}
    />
  );
}
