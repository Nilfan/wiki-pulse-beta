import { Suspense } from "react";
import type { DashboardSearchParamsInput } from "@/lib/queries/dashboardSearchParams";
import InsightsSkeleton from "./insights/InsightsSkeleton";
import InsightsWrapper from "./insights/InsightsWrapper";

type Props = {
  searchParams: Promise<DashboardSearchParamsInput>;
};

export default function ExtraTables({ searchParams }: Props) {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <InsightsWrapper searchParams={searchParams} />
    </Suspense>
  );
}
