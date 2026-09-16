"use client";

import clsx from "clsx";
import { CHART_TYPES, type ChartType } from "./chartSeries";

type Props = {
  value: ChartType;
  onChange: (chartType: ChartType) => void;
};

export default function ChartTypeTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Chart type"
      className="flex divide-x divide-hair border border-hair"
    >
      {CHART_TYPES.map((chartType) => (
        <button
          key={chartType}
          type="button"
          role="tab"
          aria-selected={value === chartType}
          onClick={() => onChange(chartType)}
          className={clsx(
            "px-3 py-1.5 font-data text-[12.5px] tracking-[0.02em]",
            value === chartType
              ? "bg-ink text-shell"
              : "bg-card text-ink-soft hover:text-ink",
          )}
        >
          {chartType}
        </button>
      ))}
    </div>
  );
}
