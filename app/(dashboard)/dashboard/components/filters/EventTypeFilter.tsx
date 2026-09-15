"use client";

import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import useDashboardFilter from "./useDashboardFilter";

type EventTypeFilterProps = {
  availableEventTypes: string[];
};
export default function EventTypeFilter({
  availableEventTypes = [],
}: EventTypeFilterProps) {
  const [eventTypes, setEventTypes] = useDashboardFilter<string[]>({
    name: "eventType",
    defaultValue: [],
    validValues: availableEventTypes,
  });
  const options: FilterOption[] = availableEventTypes.map((eventType) => ({
    value: eventType,
    label: eventType,
  }));

  const selectedEventTypes = options.filter((option) =>
    eventTypes.includes(option.value),
  );

  return (
    <FilterBaseButton
      name="event"
      value={
        selectedEventTypes.length
          ? selectedEventTypes.map((option) => option.label).join(", ")
          : "All events"
      }
      selectedValues={eventTypes}
      options={options}
      onValueChange={setEventTypes}
      menuLabel="Event type"
      multiple
    />
  );
}
