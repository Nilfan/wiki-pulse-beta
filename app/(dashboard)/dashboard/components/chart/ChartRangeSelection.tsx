"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { DefaultZIndexes, ZIndexLayer, usePlotArea, useXAxisInverseDataSnapScale } from "recharts";
import { getDraggedPeriod } from "./draggedPeriod";

type Props = {
  overlayContainer: HTMLDivElement | null;
  intervalMs: number;
  sinceMs: number;
  untilMs: number;
  disabled: boolean;
  onSelectingChange: (selecting: boolean) => void;
  onSelect: (start: string, end: string) => void;
};

type Drag = {
  pointerId: number;
  fromX: number;
  toX: number;
  fromTime: number;
  toTime: number;
  clientX: number;
};

export default function ChartRangeSelection({ intervalMs, sinceMs, untilMs, disabled, onSelect, onSelectingChange, overlayContainer }: Props) {
  const plot = usePlotArea();
  const inverseScale = useXAxisInverseDataSnapScale();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pending, setPending] = useState<Drag | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selection = drag ?? pending;
  const selecting = selection !== null;

  useEffect(() => {
    onSelectingChange(selecting);
    return () => onSelectingChange(false);
  }, [selecting, onSelectingChange]);

  useEffect(() => {
    if (!selecting) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrag(null); setPending(null); }
    };
    document.addEventListener("keydown", cancel);
    return () => document.removeEventListener("keydown", cancel);
  }, [selecting]);

  useEffect(() => {
    if (!pending) return;
    const dismissOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !popupRef.current?.contains(event.target)) {
        setPending(null);
      }
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [pending]);

  if (!plot || !inverseScale || disabled || plot.width <= 0) return null;

  function position(event: PointerEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix || !plot || !inverseScale) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const x = Math.max(plot.x, Math.min(plot.x + plot.width, point.matrixTransform(matrix.inverse()).x));
    const timestamp = inverseScale(x);
    return typeof timestamp === "number" && Number.isFinite(timestamp) ? { x, timestamp } : null;
  }

  const period = selection ? getDraggedPeriod(selection.fromTime, selection.toTime, intervalMs, sinceMs, untilMs) : null;
  const labelWidth = Math.min(360, plot.width);
  const labelX = selection ? Math.max(plot.x, Math.min(
    plot.x + plot.width - labelWidth,
    (selection.fromX + selection.toX) / 2 - labelWidth / 2,
  )) : plot.x;
  const formatDate = (iso: string) => new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  return (
    <ZIndexLayer zIndex={DefaultZIndexes.activeDot + 1}>
    <g>
      <rect
        data-chart-range-selection="true"
        {...plot}
        fill="transparent"
        className="cursor-crosshair select-none"
        onPointerDown={(event) => {
          if (event.button !== 0 || event.pointerType !== "mouse" || !event.isPrimary) return;
          const point = position(event);
          if (!point) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setPending(null);
          setDrag({ pointerId: event.pointerId, fromX: point.x, toX: point.x, fromTime: point.timestamp, toTime: point.timestamp, clientX: event.clientX });
        }}
        onPointerMove={(event) => {
          if (!drag || event.pointerId !== drag.pointerId) return;
          const point = position(event);
          if (point) setDrag({ ...drag, toX: point.x, toTime: point.timestamp });
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (!drag || event.pointerId !== drag.pointerId || event.button !== 0) return;
          setDrag(null);
          // A normal click or a tiny hand movement must not change the filters.
          if (Math.abs(event.clientX - drag.clientX) < 5) return;
          const point = position(event);
          if (!point) return;
          const period = getDraggedPeriod(drag.fromTime, point.timestamp, intervalMs, sinceMs, untilMs);
          if (period) setPending({ ...drag, toX: point.x, toTime: point.timestamp });
        }}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={() => setDrag(null)}
      />
      {selection && (
        <rect
          data-chart-range-highlight="true"
          x={Math.min(selection.fromX, selection.toX)}
          y={plot.y}
          width={Math.abs(selection.toX - selection.fromX)}
          height={plot.height}
          fill="var(--color-signal)"
          fillOpacity={0.16}
          stroke="var(--color-signal)"
          pointerEvents="none"
        />
      )}
      {period && overlayContainer && createPortal(
        <div
          ref={popupRef}
          data-chart-range-dates="true"
          className="absolute top-[calc(100%-52px)] z-30 border border-signal bg-card p-3 font-data text-[11px] text-ink shadow-md"
          style={{ left: labelX, width: labelWidth }}
        >
          <p>Start: {formatDate(period.start)}</p>
          <p className="mt-1">End: {formatDate(period.end)}</p>
          {pending && (
            <div role="group" aria-label="Confirm selected period" className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setPending(null); onSelect(period.start, period.end); }}
                className="border border-ink bg-ink px-4 py-1.5 text-xs text-paper hover:bg-signal focus-visible:outline-2 focus-visible:outline-signal"
              >Apply range</button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="border border-ink bg-white px-3 py-1.5 text-xs text-ink hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-signal"
              >Cancel</button>
            </div>
          )}
        </div>,
        overlayContainer,
      )}
    </g>
    </ZIndexLayer>
  );
}
