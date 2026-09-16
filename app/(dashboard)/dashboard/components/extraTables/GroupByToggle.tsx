"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  DIMENSION_LABELS,
  type DashboardGroupBy,
} from "@/lib/queries/dashboardSearchParams";
import { setDashboardSearchParam } from "../filters/useDashboardFilter";

type Props = {
  dimension: DashboardGroupBy;
  isGrouped: boolean;
  /** The dimension is filtered to picked values, so grouping is refused. */
  disabled?: boolean;
  children: string;
};

/** Adds or removes one dimension from the chart's groupBy, leaving the rest. */
export default function GroupByToggle({
  dimension,
  isGrouped,
  disabled = false,
  children,
}: Props) {
  const pathname = usePathname();

  const toggle = () => {
    const groupBy = new URLSearchParams(window.location.search)
      .getAll("groupBy")
      .filter((value) => value !== dimension);

    setDashboardSearchParam(
      pathname,
      "groupBy",
      isGrouped ? groupBy : [...groupBy, dimension],
    );
  };

  return (
    <button
      type="button"
      aria-pressed={isGrouped}
      disabled={disabled}
      title={
        disabled
          ? `Filtered by ${DIMENSION_LABELS[dimension]} — reset that filter to group`
          : undefined
      }
      onClick={toggle}
      className={clsx(
        "border px-2 py-1 font-data text-[11.5px] transition-colors",
        disabled
          ? "cursor-not-allowed border-hair text-ink-3"
          : isGrouped
            ? "border-brand bg-brand text-shell"
            : "border-brand/45 text-brand hover:border-brand",
      )}
    >
      {children}
    </button>
  );
}
