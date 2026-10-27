import { Suspense } from "react";
import type { DashboardSearchParamsInput } from "@/lib/queries/dashboardSearchParams";
import ExtraTablesWrapper from "./ExtraTablesWrapper";

type Props = { searchParams: Promise<DashboardSearchParamsInput> };

function OverviewSkeleton() {
  return <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-5">
    <div className="h-20 w-2/3 rounded-xl bg-[#e3e8f0] motion-safe:animate-pulse" />
    <div className="h-20 rounded-xl border border-hair bg-white" />
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map(key => <div key={key} className="h-32 rounded-[14px] border border-hair bg-white motion-safe:animate-pulse" />)}</div>
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]"><div className="h-96 rounded-[14px] border border-hair bg-white" /><div className="h-96 rounded-[14px] border border-hair bg-white" /></div>
  </div>;
}

export default function ExtraTables({ searchParams }: Props) {
  return <Suspense fallback={<OverviewSkeleton />}><ExtraTablesWrapper searchParams={searchParams} /></Suspense>;
}
