import DateRangeFilter from "./DateRangeFilter";
import GroupByFilter from "./GroupByFilter";
import IntervalFilter from "./IntervalFilter";
import ValueFilters from "./ValueFilters";

export default function DashboardFilters() {
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-t border-t-ink border-b border-b-ink bg-paper px-0 py-2.25 mb-2">
      <DateRangeFilter />
      <IntervalFilter />
      <GroupByFilter />
      <div
        role="separator"
        aria-orientation="vertical"
        className="mx-1 h-6 w-px shrink-0 bg-ink"
      />
      <ValueFilters />
    </div>
  );
}
