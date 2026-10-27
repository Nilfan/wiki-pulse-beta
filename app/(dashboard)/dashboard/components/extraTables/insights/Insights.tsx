import clsx from "clsx";
import type { Insights as InsightsData } from "@/lib/queries/insights";
import type { DashboardSearchParams } from "@/lib/queries/dashboardSearchParams";
import useNow from "../../../../components/heartbeat/useNow";
import { formatTotal } from "../../chart/chartAxis";

type Props = { insights: InsightsData; range: DashboardSearchParams["range"]; isLoading: boolean };

function duration(ms: number) {
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function Insights({ insights, isLoading }: Props) {
  const now = useNow();
  const latestAge = insights.lastEventMs === null ? null : duration((now ?? insights.untilMs) - insights.lastEventMs);
  const cells = [
    { label: "Sampled events", value: formatTotal(insights.events), detail: "in the selected period" },
    { label: "Active wikis", value: formatTotal(insights.wikis), detail: "with at least one matching event" },
    { label: "Unique pages", value: formatTotal(insights.paths), detail: insights.paths ? `${(insights.events / insights.paths).toFixed(1)} events per page on average` : "in the selected period" },
    { label: "Latest event", value: latestAge ? `${latestAge} ago` : "—", detail: "newest matching stored event" },
  ];
  return (
    <div className={clsx("grid grid-cols-1 gap-4 transition-opacity min-[480px]:grid-cols-2 xl:grid-cols-4", isLoading && "opacity-45")} aria-busy={isLoading}>
      {cells.map(({ label, value, detail }) => <div key={label} className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-hair bg-white px-5 py-4.5">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="[font-family:var(--font-inter-tight)] text-[32px] font-bold tabular-nums">{value}</span>
        <span className="text-[13px] text-ink-3">{detail}</span>
      </div>)}
    </div>
  );
}
