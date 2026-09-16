"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GROUP_BY_FILTER_PARAM,
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import FilterBaseButton, { type FilterOption } from "./FilterBaseButton";
import { setDashboardSearchParam } from "./useDashboardFilter";

const OPTIONS = [
  { value: "event", label: "Event type" },
  { value: "page", label: "Page" },
  { value: "country", label: "Language" },
] as const satisfies readonly FilterOption[];

/**
 * A dimension with values picked in its own filter cannot also be grouped by:
 * its option is locked, and the parsed params already leave it out.
 */
export default function GroupByFilter() {
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const params = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(rawSearchParams),
      ),
    [rawSearchParams],
  );
  const { groupBy } = params;

  const options = OPTIONS.map((option) => {
    const isFiltered = params[GROUP_BY_FILTER_PARAM[option.value]].length > 0;
    return isFiltered
      ? { ...option, disabled: true, description: "filtered" }
      : option;
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
      options={options}
      onValueChange={(next) =>
        setDashboardSearchParam(pathname, "groupBy", next)
      }
      multiple
    />
  );
}
