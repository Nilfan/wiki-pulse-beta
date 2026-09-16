import { Suspense } from "react";
import type { DashboardSearchParamsInput } from "@/lib/queries/dashboardSearchParams";
import BreakdownSkeleton from "./breakdown/BreakdownSkeleton";
import ByTypeTableSkeleton from "./byType/ByTypeTableSkeleton";
import ExtraTablesWrapper from "./ExtraTablesWrapper";
import InsightsSkeleton from "./insights/InsightsSkeleton";

type Props = {
  searchParams: Promise<DashboardSearchParamsInput>;
};

export default function ExtraTables({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col">
          <InsightsSkeleton />
          <ByTypeTableSkeleton />
          <BreakdownSkeleton />
        </div>
      }
    >
      <ExtraTablesWrapper searchParams={searchParams} />
    </Suspense>
  );
}
