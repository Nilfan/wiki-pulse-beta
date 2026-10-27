import DateRangeFilter from "./DateRangeFilter";
import SamplingNote from "./SamplingNote";
import GroupByFilter from "./GroupByFilter";
import IntervalFilter from "./IntervalFilter";
import ValueFilters from "./ValueFilters";

export default function DashboardFilters() {
  return (
    <div className="relative z-40 flex flex-wrap items-center gap-2.5 rounded-2xl border border-hair bg-white p-3 shadow-[0_2px_8px_-4px_rgba(14,22,48,0.08)]">
      <DateRangeFilter />
      <ValueFilters />
      <IntervalFilter />
      <GroupByFilter />
      <SamplingNote />
    </div>
  );
}
