import { getWikiOrgId } from "@/lib/queries/organizations";
import DateRangeFilter from "./DateRangeFilter";
import EventTypeFilter from "./EventTypeFilter";
import GroupByFilter from "./GroupByFilter";
import IntervalFilter from "./IntervalFilter";
import { getEventTypes } from "@/lib/queries/events";

export default async function DashboardFilters() {
  const wikiOrgId = await getWikiOrgId();
  const availableEventTypes = await getEventTypes(wikiOrgId);
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-t border-t-ink border-b border-b-ink bg-paper px-0 py-2.25">
      <DateRangeFilter />
      <IntervalFilter />
      <EventTypeFilter availableEventTypes={availableEventTypes} />
      <GroupByFilter />
    </div>
  );
}
