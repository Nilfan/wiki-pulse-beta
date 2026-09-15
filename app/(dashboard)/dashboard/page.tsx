import { Suspense } from "react";
import ChartWrapper from "./components/chart/ChartWrapper";
import SkeletonChart from "./components/chart/SkeletonChart";
import DashboardFilters from "./components/DashboardFilters";
import DashboardFiltersSkeleton from "./components/DashboardFiltersSkeleton";
import DashboardTable from "./components/DashboardTable";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <>
      <section>
        <Suspense fallback={<DashboardFiltersSkeleton />}>
          <DashboardFilters />
        </Suspense>
      </section>
      <section>
        <Suspense fallback={<SkeletonChart />}>
          <ChartWrapper searchParams={searchParams} />
        </Suspense>
      </section>
      <section>
        <DashboardTable />
      </section>
    </>
  );
}
