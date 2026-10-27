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
      className="flex flex-wrap gap-0.5 rounded-[10px] bg-[#eef1f6] p-[3px]"
    >
      {CHART_TYPES.map((chartType) => (
        <button
          key={chartType}
          type="button"
          role="tab"
          aria-selected={value === chartType}
          onClick={() => onChange(chartType)}
          className={clsx(
            "min-h-9 rounded-[7px] px-3 py-1.5 text-sm capitalize",
            value === chartType
              ? "bg-white font-semibold text-ink shadow-sm"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {chartType}
        </button>
      ))}
    </div>
  );
}
