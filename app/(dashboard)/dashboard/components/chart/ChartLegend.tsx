import type { ChartSeries } from "./chartSeries";

type Props = {
  series: readonly ChartSeries[];
  /** Series the cap left undrawn; 0 hides the warning. */
  droppedSeriesCount?: number;
};

export default function ChartLegend({
  series,
  droppedSeriesCount = 0,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {series.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-data text-[12px] text-ink-soft">{label}</span>
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
