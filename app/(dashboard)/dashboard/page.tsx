import { Suspense } from "react";
import ChartWrapper from "./components/chart/ChartWrapper";
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
          <DashboardFilters searchParams={searchParams} />
        </Suspense>
      </section>
      <section>
        <Suspense fallback={<>Please, wait for Chart</>}>
          <ChartWrapper searchParams={searchParams} />
        </Suspense>
      </section>
      <section>
        <DashboardTable />
      </section>
    </>
  );
}
