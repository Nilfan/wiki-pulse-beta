const PULSE = "motion-safe:animate-pulse bg-paper-deep";

const ROW_WIDTHS = ["w-12", "w-24", "w-10", "w-8"];

/** Same header, bar and row rhythm as ByTypeTable, so nothing jumps on load. */
export default function ByTypeTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="flex-1 border border-hair bg-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-hair px-6 py-3">
        <span className={`block h-3.5 w-16 ${PULSE}`} />
        <span className={`block h-6 w-28 ${PULSE}`} />
      </div>
      <div className="px-6 pt-4 pb-3">
        <span className={`block h-7 w-full ${PULSE}`} />
        <ul className="mt-3 divide-y divide-hair">
          {ROW_WIDTHS.map((width) => (
            <li key={width} className="flex items-center gap-3 py-2.5">
              <span className={`block size-2.5 shrink-0 ${PULSE}`} />
              <span className="flex-1">
                <span className={`block h-3 ${width} ${PULSE}`} />
              </span>
              <span className={`block h-2 w-18 shrink-0 sm:w-28 ${PULSE}`} />
              <span className={`block h-3 w-12 shrink-0 ${PULSE}`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
