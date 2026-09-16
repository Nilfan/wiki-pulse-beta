const PULSE = "motion-safe:animate-pulse bg-paper-deep";

/** Mirrors the strip's grid and cell padding so nothing shifts on load. */
export default function InsightsSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="grid grid-cols-2 border border-hair bg-card md:grid-cols-4"
    >
      {[0, 1, 2, 3].map((cell) => (
        <div
          key={cell}
          className="border-hair px-6 py-4 not-last:border-r max-md:nth-2:border-r-0 max-md:nth-[-n+2]:border-b"
        >
          <span className={`block h-3 w-20 ${PULSE}`} />
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className={`block h-5.5 w-18 ${PULSE}`} />
            <span className={`block h-4 w-14 ${PULSE}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
