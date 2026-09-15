"use client";

import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import useDashboardFilter from "./useDashboardFilter";

const OPTIONS = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  {
    value: "1d",
    label: "1 day",
  },
] as const satisfies readonly FilterOption[];

export default function IntervalFilter() {
  const [interval, setInterval] = useDashboardFilter<string>({
    name: "interval",
    defaultValue: "15m",
    validValues: OPTIONS.map((option) => option.value),
  });
  const selectedInterval = OPTIONS.find((option) => option.value === interval);

  return (
    <FilterBaseButton
      name="interval"
      value={
        interval === "auto"
          ? "15 min (auto)"
          : (selectedInterval?.label ?? interval)
      }
      selectedValues={[interval]}
      options={OPTIONS}
      onValueChange={([nextInterval]) => setInterval(nextInterval ?? interval)}
      menuLabel="Interval granularity"
      menuHeader="GRANULARITY · date_trunc"
    />
  );
}
