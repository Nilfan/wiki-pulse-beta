"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type DashboardFilterValue = string | string[];

type UseDashboardFilterOptions<T extends DashboardFilterValue> = {
  name: string;
  defaultValue: T;
  validValues?: readonly string[];
};

export default function useDashboardFilter<T extends DashboardFilterValue>({
  name,
  defaultValue,
  validValues,
}: UseDashboardFilterOptions<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState<T>(() => {
    if (Array.isArray(defaultValue)) {
      const values = searchParams.getAll(name);
      return (
        validValues
          ? values.filter((item) => validValues.includes(item))
          : values
      ) as T;
    }

    const searchParam = searchParams.get(name);
    return (
      searchParam && (!validValues || validValues.includes(searchParam))
        ? searchParam
        : defaultValue
    ) as T;
  });

  const setFilterValue = useCallback(
    (nextValue: T) => {
      setValue(nextValue);

      const params = new URLSearchParams(window.location.search);
      params.delete(name);

      if (Array.isArray(nextValue)) {
        nextValue.forEach((item) => params.append(name, item));
      } else {
        params.set(name, nextValue);
      }

      const query = params.toString();
      // Shallow routing: `history.replaceState` still feeds `useSearchParams`
      // (so the chart sees the new filters), but unlike `router.replace` it
      // does not re-run the server components for this route. The chart owns
      // its own refetch — see useEventsSeries — and a navigation here would
      // fire a second, unabortable request for the same data.
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [name, pathname],
  );

  return [value, setFilterValue] as const;
}
