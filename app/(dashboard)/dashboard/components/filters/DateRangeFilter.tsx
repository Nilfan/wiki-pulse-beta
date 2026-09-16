"use client";

import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import useDashboardFilter from "./useDashboardFilter";

const OPTIONS = [
  { value: "15m", label: "15 min", description: "15 min" },
  { value: "1h", label: "1 hour", description: "60 min" },
  { value: "6h", label: "6 hours", description: "360 min" },
  { value: "12h", label: "12 hours", description: "720 min" },
  { value: "24h", label: "24 hours", description: "1440 min" },
  { value: "2d", label: "2 days", description: "2880 min" },
  { value: "3d", label: "3 days", description: "4320 min" },
  { value: "7d", label: "7 days", description: "10080 min" },
  { value: "14d", label: "14 days", description: "20160 min" },
  { value: "21d", label: "21 days", description: "30240 min" },
  { value: "60d", label: "60 days", description: "Test " },
] as const satisfies readonly FilterOption[];

export default function DateRangeFilter() {
  const [range, setRange] = useDashboardFilter<string>({
    name: "range",
    defaultValue: "24h",
    validValues: OPTIONS.map((option) => option.value),
  });
  const selectedRange = OPTIONS.find((option) => option.value === range);

  return (
    <FilterBaseButton
      name="range"
      value={selectedRange?.label ?? range}
      selectedValues={[range]}
      options={OPTIONS}
      onValueChange={([nextRange]) => setRange(nextRange ?? range)}
      menuLabel="Date range"
    />
  );
}
