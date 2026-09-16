"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GROUP_BY_FILTER_PARAM,
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  type DashboardGroupBy,
} from "@/lib/queries/dashboardSearchParams";
import { MAX_FILTER_VALUES } from "@/lib/queries/constants";
import { setDashboardSearchParams } from "./useDashboardFilter";

/**
 * One dimension's value filter, read from the URL so the dropdown and the
 * tables below the chart always agree on what is picked.
 *
 * Selecting a value takes the dimension out of groupBy in the same URL write —
 * see GROUP_BY_FILTER_PARAM.
 */
export default function useValueFilter(dimension: DashboardGroupBy) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = GROUP_BY_FILTER_PARAM[dimension];

  const selected = useMemo(
    () =>
      parseDashboardSearchParams(searchParamsFromURLSearchParams(searchParams))[
        param
      ],
    [searchParams, param],
  );

  const setSelected = useCallback(
    (next: string[]) => {
      const groupBy = new URLSearchParams(window.location.search).getAll(
        "groupBy",
      );
      setDashboardSearchParams(pathname, {
        [param]: next,
        ...(next.length
          ? { groupBy: groupBy.filter((value) => value !== dimension) }
          : {}),
      });
    },
    [pathname, param, dimension],
  );

  const isAtLimit = selected.length >= MAX_FILTER_VALUES;

  const toggle = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        setSelected(selected.filter((item) => item !== value));
      } else if (!isAtLimit) {
        setSelected([...selected, value]);
      }
    },
    [selected, isAtLimit, setSelected],
  );

  return { selected, setSelected, toggle, isAtLimit };
}
