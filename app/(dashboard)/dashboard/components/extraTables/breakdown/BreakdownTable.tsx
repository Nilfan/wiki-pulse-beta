"use client";

import { useState } from "react";
import clsx from "clsx";
import type { BreakdownDimension } from "@/lib/queries/breakdown";
import { DIMENSION_LABELS } from "@/lib/queries/dashboardSearchParams";
import { formatShare, formatTotal } from "../../chart/chartAxis";
import useValueFilter from "../../filters/useValueFilter";
import GroupByToggle from "../GroupByToggle";
import BreakdownPie from "./BreakdownPie";
import type useBreakdown from "./useBreakdown";
import VirtualList from "../../VirtualList";

type Props = {
  title: string;
  dimension: BreakdownDimension;
  breakdown: ReturnType<typeof useBreakdown>;
  formatLabel: (value: string) => string;
  isGrouped: boolean;
  isGroupByDisabled: boolean;
  /** Offers a pie of the busiest values alongside the list. */
  withPie?: boolean;
};

const VIEWS = ["list", "pie"] as const;
type View = (typeof VIEWS)[number];

/** Matches the row rhythm of the by-type list. */
export const BREAKDOWN_ROW_HEIGHT = 44;
export const BREAKDOWN_VISIBLE_ROWS = 6;
const BODY_HEIGHT = BREAKDOWN_ROW_HEIGHT * BREAKDOWN_VISIBLE_ROWS;

export default function BreakdownTable({
  title,
  dimension,
  breakdown,
  formatLabel,
  isGrouped,
  isGroupByDisabled,
  withPie = false,
}: Props) {
  const [view, setView] = useState<View>("list");
  const { selected, toggle, isAtLimit } = useValueFilter(dimension);
  const { rows, total, isLoading, isLoadingMore, hasMore, hasLoadMoreError } =
    breakdown;

  let footer = null;
  if (hasLoadMoreError) {
    footer = (
      <button
        type="button"
        onClick={breakdown.loadMore}
        className="flex h-full w-full items-center justify-center font-data text-[12px] text-brand hover:underline"
      >
        couldn’t load more — retry
      </button>
    );
  } else if (hasMore) {
    footer = (
      <p
        aria-live="polite"
        className="flex h-full items-center justify-center font-data text-[12px] text-ink-3"
      >
        {isLoadingMore ? "loading…" : ""}
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col rounded-[14px] border border-hair bg-white pb-3">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5.5 py-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {withPie && (
            <ViewTabs value={view} onChange={setView} label={title} />
          )}
          <GroupByToggle
            dimension={dimension}
            isGrouped={isGrouped}
            disabled={isGroupByDisabled}
          >
            {`group by ${DIMENSION_LABELS[dimension]}`}
          </GroupByToggle>
        </div>
      </header>

      <p className="px-5.5 pb-3 text-xs text-ink-3">{dimension === "page" ? "Pages ranked by sampled events. Select a page to filter." : "Share by recorded language. Unspecified includes multilingual wikis such as Commons and Wikidata."}</p>
      {total === 0 ? (
        <p
          className="flex items-center justify-center font-data text-[12.5px] text-ink-3"
          style={{ height: BODY_HEIGHT }}
        >
          No events in this window.
        </p>
      ) : (
        <div className={clsx("transition-opacity", isLoading && "opacity-45")}>
          {withPie && view === "pie" ? (
            <BreakdownPie
              rows={rows}
              total={total}
              formatLabel={formatLabel}
              height={BODY_HEIGHT}
            />
          ) : (
            <VirtualList
              // A new filter set starts from the top; a refresh keeps the scroll.
              key={breakdown.queryString}
              label={title}
              count={rows.length}
              rowHeight={BREAKDOWN_ROW_HEIGHT}
              visibleRows={BREAKDOWN_VISIBLE_ROWS}
              onEndReached={breakdown.loadMore}
              footer={footer}
              renderRow={(index) => {
                const { value, count } = rows[index];
                const label = formatLabel(value);
                const share = count / total;
                const isSelected = selected.includes(value);
                const isDisabled = !isSelected && isAtLimit;

                return (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    title={
                      isSelected
                        ? `Remove ${label} from the ${DIMENSION_LABELS[dimension]} filter`
                        : `Filter by ${label}`
                    }
                    onClick={() => toggle(value)}
                    className={clsx(
                      "block h-full w-full px-5.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-inset",
                      isSelected
                        ? "bg-paper-deep shadow-[inset_2px_0_0_var(--color-ink)]"
                        : "hover:bg-paper-deep/60",
                      isDisabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="flex h-full items-center gap-3 border-b border-[#eef1f6] text-sm text-ink">
                      <span className="w-5 shrink-0 text-ink-3 tabular-nums">
                        {index + 1}
                      </span>
                      <span
                        className={clsx(
                          "min-w-0 flex-1 truncate",
                          isSelected && "font-medium",
                        )}
                        title={label}
                      >
                        {label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-[#eef1f6] min-[1200px]:w-20"
                      >
                        <span
                          className="block h-full rounded-full bg-signal"
                          style={{ width: `${share * 100}%` }}
                        />
                      </span>
                      <span
                        className="w-14 shrink-0 text-right font-semibold tabular-nums"
                        title={formatTotal(count)}
                      >
                        {dimension === "page" ? formatTotal(count) : formatShare(share)}
                      </span>
                    </span>
                  </button>
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

type ViewTabsProps = {
  value: View;
  onChange: (view: View) => void;
  label: string;
};

function ViewTabs({ value, onChange, label }: ViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={`${label} view`}
      className="inline-flex shrink-0 gap-1 rounded-2xl border border-hair bg-[#f3f6fb] p-1"
    >
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={value === view}
          onClick={() => onChange(view)}
          className={clsx(
            "min-h-9 rounded-xl px-3.5 py-2 text-sm capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal/30 focus-visible:ring-offset-1",
            value === view
              ? "bg-white font-semibold text-signal shadow-sm"
              : "text-ink-soft hover:bg-white/70 hover:text-ink",
          )}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
