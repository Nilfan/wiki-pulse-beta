"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
} from "recharts";
import type { EventsSeriesWirePoint } from "@/lib/queries/events";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import CacheBadge from "./CacheBadge";
import ChartCursor from "./ChartCursor";
import ChartLegend from "./ChartLegend";
import ChartTooltip from "./ChartTooltip";
import ChartTypeTabs from "./ChartTypeTabs";
import {
  formatCompact,
  formatTotal,
  getRangeLabel,
  getTimeFormatter,
  getTimeTicks,
  getValueTicks,
} from "./chartAxis";
import { buildChartData, type ChartType } from "./chartSeries";
import useEventsSeries from "./useEventsSeries";

type Props = {
  initialEvents: EventsSeriesWirePoint[];
  initialUntilMs: number;
};

/** The right gutter keeps the trailing time label from being clipped. */
const CHART_MARGIN = { top: 14, right: 20, bottom: 0, left: 0 };
const AXIS_TICK = {
  fill: "var(--color-ink-3)",
  fontSize: 11.5,
  fontFamily: "var(--font-data)",
};

export default function Chart({ initialEvents, initialUntilMs }: Props) {
  const [chartType, setChartType] = useState<ChartType>("line");

  // The URL is the filter state. Reading it here rather than taking it as a
  // prop means a filter change reaches the chart without a navigation — see
  // useDashboardFilter.
  const rawSearchParams = useSearchParams();
  const params = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(rawSearchParams),
      ),
    [rawSearchParams],
  );
  const { range, groupBy } = params;
  // Canonical form of the same filters: what the refetch is keyed on, and the
  // query string it sends. Two filter states that differ only in click order
  // serialise identically, so they do not count as a change.
  const queryString = useMemo(
    () => serializeDashboardSearchParams(params),
    [params],
  );

  const { events, untilMs, isLoading } = useEventsSeries(queryString, {
    events: initialEvents,
    untilMs: initialUntilMs,
    isLoading: false,
  });

  const { rows, series, total, droppedSeriesCount } = useMemo(
    () => buildChartData(events, groupBy),
    [events, groupBy],
  );

  const formatTime = useMemo(() => getTimeFormatter(range), [range]);
  const timeTicks = useMemo(() => getTimeTicks(rows), [rows]);
  const valueTicks = useMemo(
    () => getValueTicks(rows, series, chartType),
    [rows, series, chartType],
  );

  const lastIndex = rows.length - 1;
  /**
   * Only the trailing point carries a dot, to mark where the series stops —
   * and only for a single line, where "the end of the series" is unambiguous.
   */
  const renderEndDot = (dotProps: DotItemDotProps) =>
    dotProps.index === lastIndex ? (
      <circle
        key="end"
        cx={dotProps.cx}
        cy={dotProps.cy}
        r={4}
        fill="var(--color-card)"
        stroke="var(--color-ink-3)"
        strokeWidth={1.2}
      />
    ) : null;

  return (
    <div className="border border-hair bg-card px-6 py-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="font-data text-[11px] tracking-[0.14em] text-ink-3 uppercase">
            events · {getRangeLabel(range)}
          </p>
          <p className="mt-1.5 font-display text-[44px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">
            {formatTotal(total)}
          </p>
          <p className="mt-2.5 font-data text-[12.5px] text-ink-3">
            — enable compare for a delta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CacheBadge untilMs={untilMs} isLoading={isLoading} />
          <ChartTypeTabs value={chartType} onChange={setChartType} />
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="py-16 text-center font-data text-[12.5px] text-ink-3">
          No events in this window.
        </p>
      ) : (
        <>
          <div
            className={clsx(
              "mt-6 h-65 transition-opacity",
              isLoading && "opacity-45",
            )}
          >
            <ComposedChart
              responsive
              style={{ width: "100%", height: "100%" }}
              data={rows}
              margin={CHART_MARGIN}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-ink-faint)"
                strokeDasharray="1 4"
              />
              <XAxis
                dataKey="timestamp"
                type="category"
                interval={0}
                ticks={timeTicks}
                tickFormatter={formatTime}
                tickLine={false}
                tickMargin={10}
                tick={AXIS_TICK}
                axisLine={{ stroke: "var(--color-ink)", strokeWidth: 1 }}
              />
              <YAxis
                width={40}
                domain={[0, valueTicks[valueTicks.length - 1]]}
                ticks={valueTicks}
                tickFormatter={formatCompact}
                tickLine={false}
                tickMargin={8}
                tick={AXIS_TICK}
                axisLine={false}
              />
              <Tooltip
                content={ChartTooltip}
                cursor={<ChartCursor />}
                isAnimationActive={false}
              />
              {series.map(({ key, label, color }) => {
                if (chartType === "line") {
                  return (
                    <Line
                      key={key}
                      name={label}
                      dataKey={key}
                      type="monotone"
                      stroke={color}
                      strokeWidth={1.6}
                      dot={series.length === 1 ? renderEndDot : false}
                      activeDot={{ r: 3, strokeWidth: 0, fill: color }}
                      isAnimationActive={false}
                    />
                  );
                }

                if (chartType === "area") {
                  return (
                    <Area
                      key={key}
                      name={label}
                      dataKey={key}
                      type="monotone"
                      stroke={color}
                      strokeWidth={1.6}
                      fill={color}
                      fillOpacity={0.16}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0, fill: color }}
                      isAnimationActive={false}
                    />
                  );
                }

                return (
                  <Bar
                    key={key}
                    name={label}
                    dataKey={key}
                    fill={color}
                    stackId={chartType === "stacked" ? "series" : undefined}
                    isAnimationActive={false}
                  />
                );
              })}
            </ComposedChart>
          </div>
          <ChartLegend
            series={series}
            droppedSeriesCount={droppedSeriesCount}
          />
        </>
      )}
    </div>
  );
}
