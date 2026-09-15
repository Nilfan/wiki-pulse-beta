const filterWidths = ["w-27", "w-31", "w-34", "w-35"];

export default function DashboardFiltersSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-40 flex min-h-12 flex-wrap items-center gap-2 border-y border-ink bg-paper px-0 py-2.25"
    >
      {filterWidths.map((width) => (
        <span
          key={width}
          className={`block h-8 ${width} motion-safe:animate-pulse bg-paper-deep`}
        />
      ))}
    </div>
  );
}
