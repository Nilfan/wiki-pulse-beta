/**
 * Stand-in for the chart while the first series is being fetched.
 *
 * It mirrors the real card's geometry — same padding, same 40px axis gutter,
 * same plot height, same dotted gridlines and baseline — so the frame stays
 * put when the data lands and only the contents change. Placeholders sit where
 * the header figure, the badge, the tabs and the legend will be.
 */

/** Matches CartesianGrid's strokeDasharray="1 4" on the real plot. */
const DOTTED_GRID =
  "repeating-linear-gradient(to right, var(--color-ink-faint) 0 1px, transparent 1px 5px)";

const PULSE = "motion-safe:animate-pulse bg-paper-deep";

const LEGEND_WIDTHS = ["w-14", "w-20", "w-16", "w-12"];

export default function SkeletonChart() {
  return (
    <div
      aria-hidden="true"
      className="border border-hair bg-card px-6 py-5"
      role="presentation"
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <span className={`block h-3 w-40 ${PULSE}`} />
          <span className={`mt-2.5 block h-10 w-52 ${PULSE}`} />
          <span className={`mt-3 block h-3 w-48 ${PULSE}`} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`block h-8 w-22 ${PULSE}`} />
          <span className={`block h-8 w-56 ${PULSE}`} />
        </div>
      </header>

      <div className="mt-6 flex h-65 flex-col">
        <div className="flex min-h-0 flex-1">
          {/* Axis gutter: YAxis reserves 40px on the real chart. */}
          <div className="flex w-10 shrink-0 flex-col items-end justify-between pr-2">
            {[0, 1, 2].map((tick) => (
              <span key={tick} className={`block h-2.5 w-6 ${PULSE}`} />
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Two dotted gridlines, then the solid baseline — as drawn. */}
            {["top-0", "top-1/2"].map((position) => (
              <span
                key={position}
                className={`absolute inset-x-0 ${position} h-px`}
                style={{ backgroundImage: DOTTED_GRID }}
              />
            ))}
            <span className="absolute inset-x-0 bottom-0 h-px bg-ink" />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full motion-safe:animate-pulse"
            >
              <path
                d="M0 78 C 8 76, 14 62, 22 58 S 36 40, 46 34 S 60 48, 68 41 S 84 22, 100 16"
                fill="none"
                stroke="var(--color-paper-deep)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Time-axis labels. */}
        <div className="mt-2.5 flex justify-between pl-10">
          {[0, 1, 2, 3, 4, 5].map((tick) => (
            <span key={tick} className={`block h-2.5 w-8 ${PULSE}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
        {LEGEND_WIDTHS.map((width) => (
          <span key={width} className="flex items-center gap-2">
            <span className={`block size-2.5 shrink-0 ${PULSE}`} />
            <span className={`block h-2.5 ${width} ${PULSE}`} />
          </span>
        ))}
      </div>
    </div>
  );
}
