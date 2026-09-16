"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Insights as InsightsData } from "@/lib/queries/insights";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import ByTypeTable from "./byType/ByTypeTable";
import Insights from "./insights/Insights";
import useInsights from "./useInsights";

type Props = {
  initialInsights: InsightsData;
};

/**
 * Owns the one request behind every section below the chart, so a filter
 * change costs a single fetch and all sections dim and settle together.
 */
export default function ExtraTablesView({ initialInsights }: Props) {
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

  const { insights, isLoading } = useInsights(queryString, initialInsights);

  return (
    <div className="flex flex-1 flex-col">
      <Insights
        insights={insights}
        range={params.range}
        isLoading={isLoading}
      />
      <ByTypeTable
        types={insights.types}
        isGroupedByType={params.groupBy.includes("event")}
        isLoading={isLoading}
      />
    </div>
  );
}
