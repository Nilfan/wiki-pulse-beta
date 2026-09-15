"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";

const OPTIONS = [
  { value: "event", label: "Event type" },
  { value: "page", label: "Page" },
  { value: "referrer", label: "Referrer" },
  { value: "country", label: "Country" },
] as const satisfies readonly FilterOption[];

type GroupByFilterProps = {
  groupBy: string[];
};

export default function GroupByFilter({ groupBy }: GroupByFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedGroupBy = OPTIONS.filter((option) =>
    groupBy.includes(option.value),
  );

  function updateGroupBy(nextGroupBy: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("groupBy");
    nextGroupBy.forEach((groupByValue) =>
      params.append("groupBy", groupByValue),
    );
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

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
      onValueChange={updateGroupBy}
      multiple
    />
  );
}
