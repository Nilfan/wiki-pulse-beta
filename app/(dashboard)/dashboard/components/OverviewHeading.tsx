"use client";

import { useLocalTimeReady } from "@/lib/helpers/use-local-time-ready";
import { useSearchParams } from "next/navigation";
import { IconDownload } from "@tabler/icons-react";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { getTimeWindow } from "@/lib/queries/timeWindow";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function OverviewHeading({ untilMs }: { untilMs: number }) {
  const localTimeReady = useLocalTimeReady();
  const raw = useSearchParams();
  const params = parseDashboardSearchParams(
    searchParamsFromURLSearchParams(raw),
  );
  const window = getTimeWindow(params, untilMs);
  const queryString = serializeDashboardSearchParams(params);
  const timeZone = localTimeReady
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : undefined;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="[font-family:var(--font-inter-tight)] text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Wikipedia, in motion.
        </h1>
      </div>
      <a
        href={`/api/dashboard/recent?${queryString}${queryString ? "&" : ""}format=csv${timeZone ? `&timeZone=${encodeURIComponent(timeZone)}` : ""}`}
        aria-disabled={!localTimeReady}
        onClick={(event) => {
          if (!localTimeReady) event.preventDefault();
        }}
        title="Download up to 5,000 matching events, newest first"
        className="inline-flex h-11.5 items-center gap-2 rounded-xl border border-signal/30 bg-white px-4 text-sm font-semibold text-signal hover:bg-[#e6ecfd]"
      >
        <IconDownload size={16} aria-hidden />
        Export CSV
      </a>
    </div>
  );
}
