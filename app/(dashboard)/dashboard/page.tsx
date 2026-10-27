import type { Metadata } from "next";
import ExtraTables from "./components/extraTables/ExtraTables";

export const metadata: Metadata = { title: "Overview — WikiPulse", description: "Explore sampled Wikimedia activity, event breakdowns, pages and languages." };

type DashboardPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return <ExtraTables searchParams={searchParams} />;
}
