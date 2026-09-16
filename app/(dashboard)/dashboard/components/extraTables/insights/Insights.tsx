import { useMemo, type ReactNode } from "react";
import clsx from "clsx";
import type { Insights as InsightsData } from "@/lib/queries/insights";
import type { DashboardSearchParams } from "@/lib/queries/dashboardSearchParams";
import { formatTotal, getTimeFormatter } from "../../chart/chartAxis";
import { SERIES_COLORS } from "../../chart/chartSeries";
import Sparkline from "./Sparkline";

type Props = {
  insights: InsightsData;
  range: DashboardSearchParams["range"];
  isLoading: boolean;
};

/** Newest-event gap past which ingestion counts as behind, then as stopped. */
const LAGGING_FROM_MS = 2 * 60 * 1000;
const STALE_FROM_MS = 15 * 60 * 1000;

function formatDuration(ms: number) {
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;

  const hours = minutes / 60;
  return hours < 24 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
}

function getFreshnessStatus(gapMs: number) {
  if (gapMs < LAGGING_FROM_MS) return "healthy";
  if (gapMs < STALE_FROM_MS) return "lagging";
  return "stale";
}

export default function Insights({ insights, range, isLoading }: Props) {
  const { buckets, lastEventMs, untilMs } = insights;

  const peak = useMemo(
    () =>
      buckets.reduce<(typeof buckets)[number] | null>(
        (best, bucket) => (bucket.events > (best?.events ?? 0) ? bucket : best),
        null,
      ),
    [buckets],
  );
  const formatTime = useMemo(() => getTimeFormatter(range), [range]);

  const freshnessGapMs = lastEventMs === null ? null : untilMs - lastEventMs;

  return (
    <div
      className={clsx(
        "grid grid-cols-2 border border-hair bg-card transition-opacity md:grid-cols-4 border-b-0 border-t-0",
        isLoading && "opacity-45",
      )}
    >
      <InsightCell
        label="active wikis"
        value={formatTotal(insights.wikis)}
        aside={
          <Sparkline
            values={buckets.map(({ wikis }) => wikis)}
            color={SERIES_COLORS[0]}
          />
        }
      />
      <InsightCell
        label="peak / bucket"
        value={peak ? formatTotal(peak.events) : "—"}
        aside={peak ? formatTime(peak.timestamp) : null}
      />
      <InsightCell
        label="unique pages"
        value={formatTotal(insights.paths)}
        aside={
          <Sparkline
            values={buckets.map(({ paths }) => paths)}
            color={SERIES_COLORS[0]}
          />
        }
      />
      <InsightCell
        label="last event"
        value={freshnessGapMs === null ? "—" : formatDuration(freshnessGapMs)}
        aside={
          freshnessGapMs === null
            ? "no data"
            : getFreshnessStatus(freshnessGapMs)
        }
      />
    </div>
  );
}

type InsightCellProps = {
  label: string;
  value: string;
  /** Sparkline, or a short muted note pinned to the bottom-right corner. */
  aside: ReactNode;
};

function InsightCell({ label, value, aside }: InsightCellProps) {
  return (
    <div className="min-w-0 border-hair px-6 py-4 not-last:border-r max-md:nth-2:border-r-0 max-md:nth-[-n+2]:border-b">
      <p className="font-data text-[11.5px] text-ink-3">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-data text-[22px] leading-none font-medium text-ink tabular-nums">
          {value}
        </p>
        {typeof aside === "string" ? (
          <span className="font-data text-[12.5px] text-ink-3 tabular-nums">
            {aside}
          </span>
        ) : (
          aside
        )}
      </div>
    </div>
  );
}
