"use client";

import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import useDashboardFilter from "./useDashboardFilter";

const OPTIONS = [
  { value: "event", label: "Event type" },
  { value: "page", label: "Page" },
  { value: "country", label: "Country" },
] as const satisfies readonly FilterOption[];

export default function GroupByFilter() {
  const [groupBy, setGroupBy] = useDashboardFilter<string[]>({
    name: "groupBy",
    defaultValue: [],
    validValues: OPTIONS.map((option) => option.value),
  });
  const selectedGroupBy = OPTIONS.filter((option) =>
    groupBy.includes(option.value),
  );

  return (
    <FilterBaseButton
      name="group by"
      value={
        selectedGroupBy.length
          ? selectedGroupBy.map((option) => option.label).join(", ")
          : "No grouping"
      }
      selectedValues={groupBy}
      options={OPTIONS}
      onValueChange={setGroupBy}
      multiple
    />
  );
}
