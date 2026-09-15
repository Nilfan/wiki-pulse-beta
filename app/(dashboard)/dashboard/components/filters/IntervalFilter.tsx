"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";

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

type IntervalFilterProps = {
  interval: string;
};

export default function IntervalFilter({ interval }: IntervalFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedInterval = OPTIONS.find((option) => option.value === interval);

  function updateInterval(nextInterval: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("interval", nextInterval);
    router.replace(`${pathname}?${params.toString()}`);
  }

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
      onValueChange={([nextInterval]) =>
        updateInterval(nextInterval ?? interval)
      }
      menuLabel="Interval granularity"
      menuHeader="GRANULARITY · date_trunc"
    />
  );
}
