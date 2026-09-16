"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 1000;

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

/** One shared interval for every subscriber, stopped when the last one leaves. */
function subscribe(onTick: () => void) {
  listeners.add(onTick);
  if (timer === undefined) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((listener) => listener());
    }, TICK_MS);
  }

  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * The client clock, ticking every second; null on the server and while
 * hydrating, so nothing clock-dependent trips hydration.
 */
export default function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now || null,
    () => null,
  );
}
