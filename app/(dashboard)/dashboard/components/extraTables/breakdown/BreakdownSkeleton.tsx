import {
  BREAKDOWN_ROW_HEIGHT,
  BREAKDOWN_VISIBLE_ROWS,
} from "./BreakdownTable";

const PULSE = "motion-safe:animate-pulse bg-paper-deep";

const LABEL_WIDTHS = ["w-56", "w-40", "w-48", "w-32", "w-44", "w-36"];

/** Same header and row rhythm as BreakdownTable, so nothing jumps on load. */
function BreakdownTableSkeleton() {
  return (
    <div className="flex min-w-0 flex-col border border-hair bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-hair px-6 py-3">
        <span className={`block h-3.5 w-20 ${PULSE}`} />
        <span className={`block h-6 w-32 ${PULSE}`} />
      </div>
      <ul style={{ height: BREAKDOWN_ROW_HEIGHT * BREAKDOWN_VISIBLE_ROWS }}>
        {Array.from({ length: BREAKDOWN_VISIBLE_ROWS }, (_, index) => (
          <li
            key={index}
            className="mx-6 flex items-center gap-3 border-b border-hair"
            style={{ height: BREAKDOWN_ROW_HEIGHT }}
          >
            <span className={`block h-3 w-4 shrink-0 ${PULSE}`} />
            <span className="w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span
                className={`block h-3 max-w-full ${LABEL_WIDTHS[index % LABEL_WIDTHS.length]} ${PULSE}`}
              />
            </span>
            <span className={`block h-2 w-18 shrink-0 sm:w-28 ${PULSE}`} />
            <span className={`block h-3 w-10 shrink-0 ${PULSE}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BreakdownSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="grid md:grid-cols-2 *:border-t-0 md:*:not-first:border-l-0"
    >
      <BreakdownTableSkeleton />
      <BreakdownTableSkeleton />
    </div>
  );
}
