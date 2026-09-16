import clsx from "clsx";
import type { ChartSeries } from "./chartSeries";

type Props = {
  series: readonly ChartSeries[];
  /** Keys of the series currently switched off. */
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
  /** Series the cap left undrawn; 0 hides the warning. */
  droppedSeriesCount?: number;
};

export default function ChartLegend({
  series,
  hiddenKeys,
  onToggle,
  droppedSeriesCount = 0,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {series.map(({ key, label, color }) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={!hiddenKeys.has(key)}
              title={hiddenKeys.has(key) ? "Show series" : "Hide series"}
              onClick={() => onToggle(key)}
              className={clsx(
                "flex cursor-pointer items-center gap-2 transition-opacity",
                hiddenKeys.has(key) && "opacity-40",
              )}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0"
                style={{ backgroundColor: color }}
              />
              <span
                className={clsx(
                  "font-data text-[12px] text-ink-soft",
                  hiddenKeys.has(key) && "line-through",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {droppedSeriesCount > 0 ? (
        // Icon plus wording, never the colour alone — the chart is otherwise
        // silent about the groups it left out.
        <p
          className="ml-auto flex items-center gap-1.5 font-data text-[12px] text-alert"
          title={`The ${series.length} busiest groups are drawn. ${droppedSeriesCount} quieter ${
            droppedSeriesCount === 1 ? "group is" : "groups are"
          } not shown, though their events are still counted in the total above.`}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2.5 15 14.5H1z" />
            <path d="M8 6.5v3.5" />
            <path d="M8 12.4h.01" />
          </svg>
          {droppedSeriesCount} more {droppedSeriesCount === 1 ? "group" : "groups"} not shown
        </p>
      ) : null}
    </div>
  );
}
