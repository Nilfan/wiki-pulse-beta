"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import type { Heartbeat } from "@/lib/queries/heartbeat";
import useHeartbeat, { type HeartbeatReading } from "./useHeartbeat";
import useNow from "./useNow";

/** How long the trace runs on its own after the page opens. */
const INTRO_MS = 2000;

/**
 * Newest-event gap past which ingestion counts as behind, then as stopped.
 * Gaps of around ten minutes are normal for this source.
 */
const LAGGING_FROM_MS = 20 * 60 * 1000;
const STALE_FROM_MS = 30 * 60 * 1000;

type HeartbeatStatus = "healthy" | "lagging" | "stale" | "no data";

/**
 * Age of the newest event right now: its age at the check plus the time since
 * the reading arrived. Before hydration only the first part is known.
 */
function getEventAgeMs(
  { lastEventMs, checkedAtMs, receivedAtMs }: HeartbeatReading,
  nowMs: number | null,
): number | null {
  if (lastEventMs === null) return null;

  const sinceReadingMs = nowMs === null ? 0 : Math.max(0, nowMs - receivedAtMs);
  return checkedAtMs - lastEventMs + sinceReadingMs;
}

function getHeartbeatStatus(gapMs: number | null): HeartbeatStatus {
  if (gapMs === null) return "no data";
  if (gapMs < LAGGING_FROM_MS) return "healthy";
  if (gapMs < STALE_FROM_MS) return "lagging";
  return "stale";
}

function formatAgo(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

/**
 * Traces three beats long, each beat 48 units wide on a baseline at y=10. The
 * viewport shows a beat and a half, and the ecg keyframes shift by exactly one
 * beat, so the loop is seamless.
 */
function repeatBeat(beat: string) {
  return [0, 48, 96]
    .map((offset) =>
      beat.replace(
        /([HL])(\d+(?:\.\d+)?)/g,
        (_, command: string, x: string) => `${command}${Number(x) + offset}`,
      ),
    )
    .reduce((path, shifted) => `${path} ${shifted}`, "M0 10");
}

const TRACE = {
  strong: repeatBeat(
    "H16 L19 7.5 L22 10 H25 L27 13 L30 1.5 L33 18 L35 10 H38 L41 6.5 L44 10 H48",
  ),
  weak: repeatBeat("H18 L20 9 L22 10 H27 L29 6.5 L31 12.5 L33 10 H48"),
  flat: "M0 10 H144",
};

const STATUS_VIEW: Record<
  HeartbeatStatus,
  { trace: string; motion?: string; tone: string; dashed?: boolean }
> = {
  healthy: {
    trace: TRACE.strong,
    motion: "motion-safe:animate-ecg",
    tone: "text-live",
  },
  lagging: {
    trace: TRACE.weak,
    motion: "motion-safe:animate-ecg-slow",
    tone: "text-alert",
  },
  stale: { trace: TRACE.flat, tone: "text-ink-3" },
  "no data": { trace: TRACE.flat, tone: "text-ink-3", dashed: true },
};

/**
 * Ingestion status in the header, drawn as a monitor trace: a steady rhythm
 * while events flow, a faint slow one when they fall behind, a flatline once
 * they stop. The trace runs for a moment on load and then while hovered.
 * The event age counts up between checks and the status follows it; each
 * check resets both to what the server saw.
 */
export default function HeartbeatBadge({
  initialHeartbeat,
}: {
  initialHeartbeat: Heartbeat;
}) {
  const heartbeat = useHeartbeat(initialHeartbeat);
  const eventAgeMs = getEventAgeMs(heartbeat, useNow());
  const status = getHeartbeatStatus(eventAgeMs);
  const view = STATUS_VIEW[status];
  // The trace runs briefly on load, then only while the block is hovered,
  // pausing wherever it is rather than snapping back.
  const [isIntroPlaying, setIsIntroPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsIntroPlaying(false), INTRO_MS);
    return () => clearTimeout(timer);
  }, []);
  const ago = eventAgeMs === null ? null : formatAgo(eventAgeMs);

  return (
    <HeartbeatFrame
      label={`Ingestion ${status}${ago ? `, last event ${ago}` : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HeartbeatCell className={clsx("gap-2.5", view.tone)}>
        <HeartbeatTrace
          path={view.trace}
          motion={view.motion}
          isPlaying={isIntroPlaying || isHovered}
          dashed={view.dashed}
        />
        <span className="uppercase tracking-[0.08em]">{status}</span>
      </HeartbeatCell>
      <HeartbeatCell className="text-ink-3 tabular-nums max-sm:hidden">
        {ago ? (
          <>
            <span className="mr-1.5 text-ink-3/70">last</span>
            {ago}
          </>
        ) : (
          "—"
        )}
      </HeartbeatCell>
    </HeartbeatFrame>
  );
}

export function HeartbeatTrace({
  path,
  motion,
  isPlaying = true,
  dashed = false,
}: {
  path: string;
  motion?: string;
  isPlaying?: boolean;
  dashed?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 72 20"
      className="h-4 w-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_45%)]"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "2 3" : undefined}
        vectorEffect="non-scaling-stroke"
        className={motion}
        style={{ animationPlayState: isPlaying ? "running" : "paused" }}
      />
    </svg>
  );
}

export function HeartbeatCell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "flex items-center px-2.5 not-first:border-l not-first:border-hair",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function HeartbeatFrame({
  label,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  label: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex h-8 items-stretch border border-hair bg-card font-data text-[10.5px] leading-none"
    >
      <HeartbeatCell className="text-ink-3 uppercase tracking-[0.12em]">
        ingest
      </HeartbeatCell>
      {children}
    </div>
  );
}
