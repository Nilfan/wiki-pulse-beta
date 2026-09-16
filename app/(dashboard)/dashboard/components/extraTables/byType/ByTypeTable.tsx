"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { InsightsType } from "@/lib/queries/insights";
import { formatTotal } from "../../chart/chartAxis";
import { setDashboardSearchParam } from "../../filters/useDashboardFilter";

type Props = {
  types: readonly InsightsType[];
  isGroupedByType: boolean;
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

function formatShare(share: number) {
  return `${(share * 100).toFixed(1)}%`;
}

export default function ByTypeTable({
  types,
  isGroupedByType,
  isLoading,
}: Props) {
  const pathname = usePathname();
  const total = types.reduce((sum, { count }) => sum + count, 0);

  const toggleGroupByType = () => {
    const groupBy = new URLSearchParams(window.location.search)
      .getAll("groupBy")
      .filter((value) => value !== "event");

    setDashboardSearchParam(
      pathname,
      "groupBy",
      isGroupedByType ? groupBy : [...groupBy, "event"],
    );
  };

  return (
    <div className="flex-1 border border-hair bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-hair px-6 py-3">
        <h2 className="font-data text-[13px] font-medium text-ink">by type</h2>
        <button
          type="button"
          aria-pressed={isGroupedByType}
          onClick={toggleGroupByType}
          className={clsx(
            "border px-2 py-1 font-data text-[11.5px] transition-colors",
            isGroupedByType
              ? "border-brand bg-brand text-shell"
              : "border-brand/45 text-brand hover:border-brand",
          )}
        >
          group by type
        </button>
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
            {types.map(({ type, count }, index) => (
              <li
                key={type}
                className="flex items-center gap-3 py-1.75 font-data text-[13px] text-ink"
              >
                <span
                  aria-hidden="true"
                  className={clsx("size-2.5 shrink-0", getTypeColor(index))}
                />
                <span className="min-w-0 flex-1 truncate">{type}</span>
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
