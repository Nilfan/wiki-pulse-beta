"use client";

import { useLocalTimeReady } from "@/lib/helpers/use-local-time-ready";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
import type { EventsSeriesWire } from "@/lib/queries/events";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardSearchParams,
} from "@/lib/queries/dashboardSearchParams";
import { DURATION_MS } from "@/lib/queries/constants";
import { getTimeWindow } from "@/lib/queries/timeWindow";
import { setDashboardSearchParams } from "../filters/useDashboardFilter";
import ChartRangeSelection from "./ChartRangeSelection";
import CacheBadge from "./CacheBadge";
import ChartCursor from "./ChartCursor";
import ChartLegend from "./ChartLegend";
import ChartTooltip from "./ChartTooltip";
import ChartTypeTabs from "./ChartTypeTabs";
import RefreshButton from "./RefreshButton";
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
import usePrefersReducedMotion from "./usePrefersReducedMotion";

type Props = {
  initialSeries: EventsSeriesWire;
};

/** The right gutter keeps the trailing time label from being clipped. */
const CHART_MARGIN = { top: 14, right: 20, bottom: 0, left: 0 };
const AXIS_TICK = {
  fill: "var(--color-ink-3)",
  fontSize: 11.5,
  fontFamily: "var(--font-data)",
};

/**
 * When fresh data lands (a filter change or the background refresh), series
 * glide from their old values to the new ones instead of jumping.
 */
const SERIES_ANIMATION = {
  animationDuration: 600,
  animationEasing: "ease-in-out",
} as const;

export default function Chart({ initialSeries }: Props) {
  const localTimeReady = useLocalTimeReady();
  const [rangeOverlayContainer, setRangeOverlayContainer] =
    useState<HTMLDivElement | null>(null);
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("line");
  // Series switched off from the legend, by key. Cleared on a filter change.
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleSeries = (key: string) =>
    setHiddenKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // The URL is the filter state. Reading it here rather than taking it as a
  // prop means a filter change reaches the chart without a navigation — see
  // useDashboardFilter.
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const params = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(rawSearchParams),
      ),
    [rawSearchParams],
  );
  const { range } = params;
  // Canonical form of the same filters: what the refetch is keyed on, and the
  // query string it sends. Two filter states that differ only in click order
  // serialise identically, so they do not count as a change.
  const queryString = useMemo(
    () => serializeDashboardSearchParams(params),
    [params],
  );

  const isAnimationActive = !usePrefersReducedMotion();

  const {
    events,
    total,
    groupCount,
    untilMs,
    queryString: loadedQueryString,
    isLoading,
    refresh,
  } = useEventsSeries(queryString, {
    ...initialSeries,
    queryString,
    isLoading: false,
  });

  // A filter change starts from every series visible. Keyed on the filters the
  // series on screen was fetched with, not the URL: clearing as soon as the
  // URL moves would redraw the old series in full while the request is out,
  // then redraw again when the response lands. Reset during render rather than
  // in an effect, so the new series never draws a frame with the old selection.
  const [hiddenKeysQueryString, setHiddenKeysQueryString] =
    useState(loadedQueryString);
  if (hiddenKeysQueryString !== loadedQueryString) {
    setHiddenKeysQueryString(loadedQueryString);
    if (hiddenKeys.size) setHiddenKeys(new Set());
  }

  // The grouping the series on screen was fetched with, not the one in the
  // URL: between a groupBy change and its response the two differ, and
  // regrouping the old points by the new dimension would draw a throwaway
  // "unknown" series before the real ones land — the chart redrawing twice.
  const loadedParams = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(new URLSearchParams(loadedQueryString)),
      ),
    [loadedQueryString],
  );

  const { rows, series, droppedSeriesCount } = useMemo(
    () => buildChartData(events, loadedParams.groupBy, groupCount),
    [events, loadedParams.groupBy, groupCount],
  );

  // Filtered after buildChartData, so a hidden series keeps its colour slot.
  const visibleSeries = useMemo(
    () => series.filter(({ key }) => !hiddenKeys.has(key)),
    [series, hiddenKeys],
  );

  const loadedWindow = getTimeWindow(loadedParams, untilMs);
  const timeDomain: [number, number] = [
    loadedWindow.since.getTime(),
    Math.max(
      loadedWindow.since.getTime() + 1,
      untilMs - DURATION_MS[loadedParams.interval],
    ),
  ];

  const formatTime = useMemo(() => getTimeFormatter(range), [range]);
  const timeTicks = useMemo(() => getTimeTicks(rows), [rows]);
  const valueTicks = useMemo(
    () => getValueTicks(rows, visibleSeries, chartType),
    [rows, visibleSeries, chartType],
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
    <section
      aria-label="Activity chart"
      className="min-w-0 rounded-[14px] border border-hair bg-white px-4 py-5 sm:px-5.5"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-ink-3">
            Sampled events per {params.interval} bucket ·{" "}
            {localTimeReady ? getRangeLabel(params) : "—"} · local time
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {formatTotal(total)} events · Drag a period, then Apply range to
            confirm.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CacheBadge
            untilMs={untilMs}
            isLoading={isLoading}
            fixedPeriod={range === "custom"}
          />
          <ChartTypeTabs value={chartType} onChange={setChartType} />
          <RefreshButton onClick={refresh} isLoading={isLoading} />
        </div>
      </header>

      {total === 0 || rows.length === 0 ? (
        <p className="py-16 text-center font-data text-[12.5px] text-ink-3">
          No events in this window.
        </p>
      ) : (
        <div ref={setRangeOverlayContainer} className="relative">
          <div
            className={clsx(
              "mt-6 h-65 select-none transition-opacity",
              isLoading && "opacity-45",
            )}
          >
            <ComposedChart
              key={chartType}
              responsive
              style={{ width: "100%", height: "100%" }}
              data={rows}
              margin={CHART_MARGIN}
            >
              <CartesianGrid vertical={false} stroke="var(--color-hair)" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={timeDomain}
                interval={0}
                ticks={timeTicks}
                tickFormatter={localTimeReady ? formatTime : () => ""}
                tickLine={false}
                tickMargin={10}
                tick={AXIS_TICK}
                axisLine={{ stroke: "var(--color-hair)", strokeWidth: 1 }}
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
                active={isRangeSelecting ? false : undefined}
                content={ChartTooltip}
                cursor={isRangeSelecting ? false : <ChartCursor />}
                isAnimationActive={false}
              />
              {visibleSeries.map(({ key, label, color }) => {
                if (chartType === "line") {
                  return (
                    <Line
                      key={key}
                      name={label}
                      dataKey={key}
                      type="monotone"
                      stroke={color}
                      strokeWidth={1.6}
                      dot={visibleSeries.length === 1 ? renderEndDot : false}
                      activeDot={{ r: 3, strokeWidth: 0, fill: color }}
                      isAnimationActive={isAnimationActive}
                      {...SERIES_ANIMATION}
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
                      isAnimationActive={isAnimationActive}
                      {...SERIES_ANIMATION}
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
                    isAnimationActive={isAnimationActive}
                    {...SERIES_ANIMATION}
                  />
                );
              })}
              <ChartRangeSelection
                key={`${queryString}:${untilMs}:${chartType}`}
                overlayContainer={rangeOverlayContainer}
                onSelectingChange={setIsRangeSelecting}
                intervalMs={DURATION_MS[loadedParams.interval]}
                sinceMs={loadedWindow.since.getTime()}
                untilMs={untilMs}
                disabled={isLoading || loadedQueryString !== queryString}
                onSelect={(start, end) =>
                  setDashboardSearchParams(pathname, {
                    range: "custom",
                    start,
                    end,
                  })
                }
              />
            </ComposedChart>
          </div>
          <ChartLegend
            series={series}
            hiddenKeys={hiddenKeys}
            onToggle={toggleSeries}
            droppedSeriesCount={droppedSeriesCount}
          />
        </div>
      )}
    </section>
  );
}
