"use client";

import clsx from "clsx";
import type { InsightsType } from "@/lib/queries/insights";
import { formatShare, formatTotal } from "../../chart/chartAxis";
import useValueFilter from "../../filters/useValueFilter";
import GroupByToggle from "../GroupByToggle";

type Props = {
  types: readonly InsightsType[];
  isGroupedByType: boolean;
  isGroupByDisabled: boolean;
  isLoading: boolean;
};

/**
 * Handed out by rank, busiest first. The brand ramp only has three readable
 * steps, so everything past them shares a neutral grey — those are the long
 * tail, and each is still named and counted in its row.
 */
const TYPE_COLORS = [
  "bg-dash-event-1",
  "bg-dash-event-2",
  "bg-dash-event-3",
] as const;
const TAIL_COLOR = "bg-rule";

function getTypeColor(index: number) {
  return TYPE_COLORS[index] ?? TAIL_COLOR;
}

export default function ByTypeTable({
  types,
  isGroupedByType,
  isGroupByDisabled,
  isLoading,
}: Props) {
  const total = types.reduce((sum, { count }) => sum + count, 0);
  const { selected, toggle, isAtLimit } = useValueFilter("event");

  return (
    <div className="flex-1 border border-hair bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-hair px-6 py-3">
        <h2 className="font-data text-[13px] font-medium text-ink">by type</h2>
        <GroupByToggle
          dimension="event"
          isGrouped={isGroupedByType}
          disabled={isGroupByDisabled}
        >
          group by type
        </GroupByToggle>
      </header>

      {total === 0 ? (
        <p className="px-6 py-10 text-center font-data text-[12.5px] text-ink-3">
          No events in this window.
        </p>
      ) : (
        <div
          className={clsx(
            "px-6 pt-4 pb-3 transition-opacity",
            isLoading && "opacity-45",
          )}
        >
          <div
            className="flex h-7 w-full overflow-hidden"
            role="img"
            aria-label={types
              .map(({ type, count }) => `${type} ${formatShare(count / total)}`)
              .join(", ")}
          >
            {types.map(({ type, count }, index) => (
              <span
                key={type}
                title={`${type} · ${formatShare(count / total)}`}
                className={clsx("h-full", getTypeColor(index))}
                style={{ width: `${(count / total) * 100}%` }}
              />
            ))}
          </div>

          <ul className="mt-3 divide-y divide-hair">
            {types.map(({ type, count }, index) => {
              const isSelected = selected.includes(type);
              const isDisabled = !isSelected && isAtLimit;

              return (
                <li key={type}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    title={
                      isSelected
                        ? `Remove ${type} from the event filter`
                        : `Filter by ${type}`
                    }
                    onClick={() => toggle(type)}
                    className={clsx(
                      "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 px-2 py-1.75 text-left font-data text-[13px] text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                      isSelected
                        ? "bg-paper-deep shadow-[inset_2px_0_0_var(--color-ink)]"
                        : "hover:bg-paper-deep/60",
                      isDisabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx("size-2.5 shrink-0", getTypeColor(index))}
                    />
                    <span
                      className={clsx(
                        "min-w-0 flex-1 truncate",
                        isSelected && "font-medium",
                      )}
                    >
                      {type}
                    </span>
                    <span
                      aria-hidden="true"
                      title={formatShare(count / total)}
                      className="h-2 w-18 shrink-0 bg-hair sm:w-28"
                    >
                      <span
                        className={clsx("block h-full", getTypeColor(index))}
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      {formatTotal(count)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
