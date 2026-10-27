"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { EventsSeriesWire } from "@/lib/queries/events";
import type { RecentEvent } from "@/lib/queries/recentEvents";
import Chart from "../chart/Chart";
import DashboardFilters from "../filters/DashboardFilters";
import OverviewHeading from "../OverviewHeading";
import RecentEvents from "../RecentEvents";
import type { BreakdownPage } from "@/lib/queries/breakdown";
import type { Insights as InsightsData } from "@/lib/queries/insights";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardFilters,
  serializeDashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { formatGroupValue } from "../chart/chartSeries";
import BreakdownTable from "./breakdown/BreakdownTable";
import useBreakdown from "./breakdown/useBreakdown";
import ByTypeTable from "./byType/ByTypeTable";
import Insights from "./insights/Insights";
import useInsights from "./useInsights";

type Props = {
  initialInsights: InsightsData;
  initialSeries: EventsSeriesWire;
  initialRecent: RecentEvent[];
  initialPages: BreakdownPage;
  initialCountries: BreakdownPage;
};

const formatPath = (value: string) => formatGroupValue("page", value);
const formatCountry = (value: string) =>
  value === "unknown"
    ? "Unspecified language"
    : formatGroupValue("country", value);

/** The by-type counts ignore the event type filter, so its key does too. */
function withoutEventType(queryString: string) {
  const searchParams = new URLSearchParams(queryString);
  searchParams.delete("eventType");
  return searchParams.toString();
}

/**
 * Owns the overview and requests behind its summary and breakdown cards. The strip and the
 * by-type list share one fetch; each breakdown list pages on its own, but all
 * of them key on the same filters and dim and settle together.
 */
export default function ExtraTablesView({
  initialInsights,
  initialSeries,
  initialRecent,
  initialPages,
  initialCountries,
}: Props) {
  const rawSearchParams = useSearchParams();
  const params = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(rawSearchParams),
      ),
    [rawSearchParams],
  );
  // groupBy only reshapes the chart; dropping it here keeps a regroup from
  // refetching figures that would come back identical.
  const queryString = useMemo(
    () => serializeDashboardSearchParams({ ...params, groupBy: [] }),
    [params],
  );

  // Interval only re-buckets, so it is left out too: the ranking over the
  // window is the same whichever bucket size the chart draws. Each list also
  // drops its own filter, which its faceted counts ignore.
  const pagesQueryString = useMemo(
    () => serializeDashboardFilters({ ...params, page: [] }),
    [params],
  );
  const countriesQueryString = useMemo(
    () => serializeDashboardFilters({ ...params, country: [] }),
    [params],
  );

  const { insights, loadedQueryString, isLoading } = useInsights(
    queryString,
    initialInsights,
  );
  // Picking a type refetches the strip, but the by-type counts would come
  // back the same, so the list stays lit while that request is out.
  const isTypesLoading =
    isLoading &&
    withoutEventType(loadedQueryString) !== withoutEventType(queryString);
  const pages = useBreakdown("page", pagesQueryString, initialPages);
  const countries = useBreakdown(
    "country",
    countriesQueryString,
    initialCountries,
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <OverviewHeading untilMs={insights.untilMs} />
      <DashboardFilters />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Chart initialSeries={initialSeries} />
        <ByTypeTable
          types={insights.types}
          isGroupedByType={params.groupBy.includes("event")}
          isGroupByDisabled={params.eventType.length > 0}
          isLoading={isTypesLoading}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="Top pages"
          dimension="page"
          breakdown={pages}
          formatLabel={formatPath}
          isGrouped={params.groupBy.includes("page")}
          isGroupByDisabled={params.page.length > 0}
        />
        <BreakdownTable
          title="Language distribution"
          dimension="country"
          breakdown={countries}
          formatLabel={formatCountry}
          isGrouped={params.groupBy.includes("country")}
          isGroupByDisabled={params.country.length > 0}
          withPie
        />
      </div>
      <Insights
        insights={insights}
        range={params.range}
        isLoading={isLoading}
      />
      <RecentEvents
        initialEvents={initialRecent}
        queryString={serializeDashboardSearchParams(params)}
      />
    </div>
  );
}
