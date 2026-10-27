"use client";

import clsx from "clsx";
import type { InsightsType } from "@/lib/queries/insights";
import { formatShare, formatTotal } from "../../chart/chartAxis";
import useValueFilter from "../../filters/useValueFilter";
import GroupByToggle from "../GroupByToggle";

type Props = { types: readonly InsightsType[]; isGroupedByType: boolean; isGroupByDisabled: boolean; isLoading: boolean };
const TYPE_COLORS: Record<string, string> = { categorize: "bg-[#2b59e8]", edit: "bg-[#1aa79a]", new: "bg-[#8b5cf6]", log: "bg-[#a8b1c1]" };
const TYPE_LABELS: Record<string, string> = { categorize: "Categorize", edit: "Edit", new: "New page", log: "Log" };
const colorFor = (type: string) => TYPE_COLORS[type] ?? "bg-[#a8b1c1]";

export default function ByTypeTable({ types, isGroupedByType, isGroupByDisabled, isLoading }: Props) {
  const total = types.reduce((sum, { count }) => sum + count, 0);
  const { selected, toggle, isAtLimit } = useValueFilter("event");
  return (
    <section aria-labelledby="event-breakdown-title" className="min-w-0 rounded-[14px] border border-hair bg-white px-4 py-5 sm:px-5.5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="event-breakdown-title" className="text-lg font-semibold">Event breakdown</h2>
        <GroupByToggle dimension="event" isGrouped={isGroupedByType} disabled={isGroupByDisabled}>Group by type</GroupByToggle>
      </header>
      <p className="mb-4 text-xs text-ink-3">All types for this period and the page/language filters. Select a row to filter.</p>
      {!total ? <p className="py-10 text-center text-sm text-ink-3">No events in this window.</p> : <div className={clsx("transition-opacity", isLoading && "opacity-45")} aria-busy={isLoading}>
        <div className="flex h-3.5 overflow-hidden rounded-[7px] gap-0.5" role="img" aria-label={types.map(({ type, count }) => `${TYPE_LABELS[type] ?? type}: ${formatShare(count / total)}`).join(", ")}>
          {types.map(({ type, count }) => <span key={type} className={colorFor(type)} style={{ width: `${count / total * 100}%` }} />)}
        </div>
        <ul className="mt-4 divide-y divide-[#eef1f6]">
          {types.map(({ type, count }) => {
            const isSelected = selected.includes(type);
            return <li key={type}><button type="button" aria-pressed={isSelected} disabled={!isSelected && isAtLimit} title={isSelected ? `Remove ${type} from the event filter` : `Filter by ${type}`} onClick={() => toggle(type)} className={clsx("flex w-full items-center gap-2.5 rounded-md py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-45", isSelected ? "bg-[#e6ecfd] font-semibold" : "hover:bg-paper")}>
              <span aria-hidden className={`size-2.5 shrink-0 rounded-[3px] ${colorFor(type)}`} /><span className="min-w-0 flex-1 truncate">{TYPE_LABELS[type] ?? type}</span><span className="font-semibold tabular-nums">{formatTotal(count)}</span><span className="w-12 text-right text-ink-3 tabular-nums">{formatShare(count / total)}</span>
            </button></li>;
          })}
        </ul>
      </div>}
    </section>
  );
}
