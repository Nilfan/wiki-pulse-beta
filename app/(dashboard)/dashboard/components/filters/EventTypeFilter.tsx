"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";

const OPTIONS = [
  { value: "pageview", label: "Page views" },
  { value: "click", label: "Clicks" },
  { value: "custom", label: "Custom events" },
] as const satisfies readonly FilterOption[];

type EventTypeFilterProps = {
  eventTypes: string[];
};

export default function EventTypeFilter({ eventTypes }: EventTypeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEventTypes = OPTIONS.filter((option) =>
    eventTypes.includes(option.value),
  );

  function updateEventTypes(nextEventTypes: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("eventType");
    nextEventTypes.forEach((eventType) =>
      params.append("eventType", eventType),
    );
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <FilterBaseButton
      name="event"
      value={
        selectedEventTypes.length
          ? selectedEventTypes.map((option) => option.label).join(", ")
          : "All events"
      }
      selectedValues={eventTypes}
      options={OPTIONS}
      onValueChange={updateEventTypes}
      menuLabel="Event type"
      multiple
    />
  );
}
