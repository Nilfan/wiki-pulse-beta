/** One row of widths per row of DashboardFilters. */
const filterRows = [
  ["w-27", "w-31", "w-35"],
  ["w-24", "w-22", "w-27"],
];

export default function DashboardFiltersSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-40 flex flex-col gap-2 border-y border-ink bg-paper px-0 py-2.25"
    >
      {filterRows.map((widths, row) => (
        <div key={row} className="flex flex-wrap items-center gap-2">
          {widths.map((width) => (
            <span
              key={width}
              className={`block h-8 ${width} motion-safe:animate-pulse bg-paper-deep`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
