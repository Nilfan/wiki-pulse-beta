"use client";

import { useId } from "react";
import { linkHorizontal, linkVertical } from "d3";
import {
  SAMPLE_RATE, BATCH_ADD_THROTTLE_MS, FLUSH_TIMEOUT_MS, MAX_BATCH_CAPACITY,
  CLEARANCE_DB_PERIOD_DAYS, CLEARANCE_PERIOD_HOURS,
} from "@/lib/collector-config";

const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const horizontal = linkHorizontal<unknown, [number, number]>();
const vertical = linkVertical<unknown, [number, number]>();
const width = 260;
const height = 112;
const nodes = [
  { id: "source", x: 40, y: 72, title: "Wikimedia SSE", value: "RecentChanges", detail: "Incoming public change events" },
  { id: "sample", x: 40, y: 310, title: "Random sampler", value: `1 in ${SAMPLE_RATE} passes`, detail: `${format(100 / SAMPLE_RATE)}% kept on average` },
  { id: "capacity", x: 420, y: 310, title: "Batch capacity guard", value: `${MAX_BATCH_CAPACITY} events max`, detail: "Full batch → candidate discarded" },
  { id: "throttle", x: 800, y: 310, title: "Time gate", value: `${format(BATCH_ADD_THROTTLE_MS)} ms apart`, detail: "Too soon → candidate discarded" },
  { id: "batch", x: 800, y: 548, title: "Map + batch", value: `${FLUSH_TIMEOUT_MS / 60000}-minute threshold`, detail: "Next message triggers batch insert" },
  { id: "database", x: 420, y: 548, title: "PostgreSQL", value: `${CLEARANCE_DB_PERIOD_DAYS}-day history`, detail: `Cleanup every ${CLEARANCE_PERIOD_HOURS} hours` },
  { id: "analytics", x: 40, y: 548, title: "Brief analytics", value: "Filter + group", detail: "Totals, trends and breakdowns" },
];
const edges: { from: string; to: string; direction: "down" | "right" | "left" }[] = [
  { from: "source", to: "sample", direction: "down" },
  { from: "sample", to: "capacity", direction: "right" },
  { from: "capacity", to: "throttle", direction: "right" },
  { from: "throttle", to: "batch", direction: "down" },
  { from: "batch", to: "database", direction: "left" },
  { from: "database", to: "analytics", direction: "left" },
];

export function FlowMap() {
  const id = useId();

  return (
    <figure className="border border-rule bg-shell">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule p-5">
        <figcaption id={`${id}-caption`} className="font-display text-sm">Follow an event through three levels</figcaption>
        <span className="font-data text-[11px] text-ink-soft">CONFIGURED LIMITS · NOT LIVE COUNTS</span>
      </div>
      <div className="overflow-x-auto p-3">
        <svg viewBox="0 0 1100 730" className="w-full min-w-[760px]" role="img" aria-labelledby={`${id}-caption ${id}-description`}>
          <desc id={`${id}-description`}>Three levels: ingestion; random sampling, batch capacity and time filtering; then batching, storage and analytics. Arrows follow the collector’s execution order. Connections show sequence, not proportional volume.</desc>
          <defs>
            <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {[{ y: 0, label: "01 / INGESTION" }, { y: 238, label: "02 / FILTERING" }, { y: 476, label: "03 / STORAGE + ANALYTICS" }].map(({ y, label }) => (
            <g key={label}>
              <rect x="16" y={y + 8} width="1068" height="220" fill="#e7eae5" fillOpacity="0.35" stroke="#c3c8c0" />
              <text x="40" y={y + 40} className="fill-ink-soft text-[12px] tracking-widest">{label}</text>
            </g>
          ))}
          {edges.map(({ from, to, direction }) => {
            const source = nodes.find((node) => node.id === from)!;
            const target = nodes.find((node) => node.id === to)!;
            const sourcePoint: [number, number] = direction === "down"
              ? [source.x + width / 2, source.y + height]
              : [source.x + (direction === "right" ? width : 0), source.y + height / 2];
            const targetPoint: [number, number] = direction === "down"
              ? [target.x + width / 2, target.y - 5]
              : [target.x + (direction === "right" ? -5 : width + 5), target.y + height / 2];
            return <path key={`${from}-${to}`} d={(direction === "down" ? vertical : horizontal)({ source: sourcePoint, target: targetPoint }) ?? undefined} fill="none" stroke="currentColor" strokeWidth="2" className="text-signal" markerEnd={`url(#${id}-arrow)`} />;
          })}
          <text x="420" y="108" className="fill-ink text-[18px]">A continuous stream, a bounded sample.</text>
          <text x="420" y="138" className="fill-ink-soft text-[13px]">No topic, event-type or Wikipedia-only host filter at ingestion.</text>
          <text x="420" y="164" className="fill-ink-soft text-[13px]">Volume is reduced by the three collector gates below.</text>
          {nodes.map((node) => {
            const dark = node.id === "analytics";
            return (
              <g key={node.id}>
                <rect x={node.x} y={node.y} width={width} height={height} fill={dark ? "#16181b" : "#ffffff"} stroke="#c3c8c0" />
                <text x={node.x + 16} y={node.y + 25} fill={dark ? "#e7eae5" : "#5c6169"} fontSize="12">{node.title}</text>
                <text x={node.x + 16} y={node.y + 59} fill={dark ? "#e7eae5" : "#2b4fe8"} fontSize="20" fontWeight="600">{node.value}</text>
                <text x={node.x + 16} y={node.y + 88} fill={dark ? "#c3c8c0" : "#5c6169"} fontSize="11">{node.detail}</text>
              </g>
            );
          })}
          <text x="170" y="451" textAnchor="middle" className="fill-ink-soft text-[12px]">{format(100 * (1 - 1 / SAMPLE_RATE))}% rejected on average</text>
          <text x="930" y="451" textAnchor="middle" className="fill-ink-soft text-[12px]">≤ {format(1000 / BATCH_ADD_THROTTLE_MS)} accepted / sec sustained</text>
        </svg>
      </div>
      <p className="border-t border-rule p-5 text-xs leading-relaxed text-ink-soft">
        Sampling percentages are expected averages. Later gates reduce the sample further;
        the collector does not record discard counts. Arrows show processing order, not event volume.
      </p>
    </figure>
  );
}
