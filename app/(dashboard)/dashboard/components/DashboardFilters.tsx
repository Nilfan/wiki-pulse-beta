import DateRangeFilter from "./filters/DateRangeFilter";
import EventTypeFilter from "./filters/EventTypeFilter";
import GroupByFilter from "./filters/GroupByFilter";
import IntervalFilter from "./filters/IntervalFilter";

type DashboardFiltersProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardFilters({
  searchParams,
}: DashboardFiltersProps) {
  const params = await searchParams;
  const range = typeof params.range === "string" ? params.range : "24h";
  const interval =
    typeof params.interval === "string" ? params.interval : "15m";
  const groupBy = Array.isArray(params.groupBy)
    ? params.groupBy
    : params.groupBy
      ? [params.groupBy]
      : [];
  const eventTypes = Array.isArray(params.eventType)
    ? params.eventType
    : params.eventType
      ? [params.eventType]
      : [];

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-t border-t-ink border-b border-b-ink bg-paper px-0 py-2.25">
      <DateRangeFilter range={range} />
      <IntervalFilter interval={interval} />
      <EventTypeFilter eventTypes={eventTypes} />
      <GroupByFilter groupBy={groupBy} />
    </div>
  );
}
