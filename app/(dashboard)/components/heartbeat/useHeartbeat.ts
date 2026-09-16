"use client";

import { useEffect, useState } from "react";
import type { Heartbeat } from "@/lib/queries/heartbeat";

/** Beats land at a random point in this span, so open tabs don't sync up. */
const BEAT_MIN_MS = 2 * 60 * 1000;
const BEAT_MAX_MS = 3 * 60 * 1000;

const randomBeatDelay = () =>
  BEAT_MIN_MS + Math.random() * (BEAT_MAX_MS - BEAT_MIN_MS);

/**
 * Keeps the header heartbeat current with a cheap poll, independent of the
 * filters and of the insights refetch. Skips beats while the tab is hidden and
 * catches up as soon as it is back if one is overdue.
 */
export type HeartbeatReading = Heartbeat & {
  /**
   * Client clock when the reading arrived, so its age can keep counting
   * without trusting the server clock. The first one lands with the page.
   */
  receivedAtMs: number;
};

export default function useHeartbeat(
  initialHeartbeat: Heartbeat,
): HeartbeatReading {
  const [heartbeat, setHeartbeat] = useState<HeartbeatReading>(() => ({
    ...initialHeartbeat,
    receivedAtMs: Date.now(),
  }));

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let lastBeatAt = Date.now();

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(beat, randomBeatDelay());
    };

    async function beat() {
      if (document.visibilityState === "hidden") return;

      lastBeatAt = Date.now();
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/dashboard/heartbeat", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Heartbeat request failed: ${response.status}`);
        }
        const next: Heartbeat = await response.json();
        if (!disposed) setHeartbeat({ ...next, receivedAtMs: Date.now() });
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // The previous reading stays up; the next beat tries again.
        console.error("Heartbeat failed", error);
      }
      if (!disposed) schedule();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastBeatAt >= BEAT_MIN_MS) beat();
      else schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return heartbeat;
}
