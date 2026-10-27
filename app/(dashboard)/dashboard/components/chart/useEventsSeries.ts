"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventsSeriesWire } from "@/lib/queries/events";
import { DEBOUNCE_MS, REFRESH_CHECK_INTERVAL_MS } from "./constants";
import { getPreviousEventsRefreshTime } from "./helpers";

export type EventsSeriesState = EventsSeriesWire & {
  /** Read points with the filters they were returned for while a new request loads. */
  queryString: string;
  isLoading: boolean;
};

/** Fetch only the chart endpoint; the API owns period bounds and bucket contents. */
export default function useEventsSeries(
  queryString: string,
  initialState: EventsSeriesState,
): EventsSeriesState & { refresh: () => Promise<void> } {
  const [state, setState] = useState(initialState);
  const loadedQueryRef = useRef(initialState.queryString);
  const queryRef = useRef(queryString);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingQueryRef = useRef<string | null>(null);
  const lastRefreshRef = useRef(
    new URLSearchParams(initialState.queryString).get("range") === "custom"
      ? getPreviousEventsRefreshTime()
      : initialState.untilMs,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (target: string) => {
    clearTimeout(debounceRef.current);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    pendingQueryRef.current = target;
    const refreshSlot = getPreviousEventsRefreshTime();
    try {
      const response = await fetch(`/api/dashboard/events?${target}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Events request failed: ${response.status}`);
      const series: EventsSeriesWire = await response.json();
      if (controller.signal.aborted) return;
      loadedQueryRef.current = target;
      lastRefreshRef.current = refreshSlot;
      // Replace the complete snapshot. Never merge points from older periods.
      setState({ ...series, queryString: target, isLoading: false });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Failed to load the events series", error);
      setState(current => ({ ...current, isLoading: false }));
    } finally {
      if (controllerRef.current === controller) pendingQueryRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setState(current => ({ ...current, isLoading: true }));
    await load(queryRef.current);
  }, [load]);

  useEffect(() => {
    queryRef.current = queryString;
    const checkForNewWindow = () => {
      if (document.visibilityState === "hidden" || pendingQueryRef.current === queryString) return;
      if (lastRefreshRef.current < getPreviousEventsRefreshTime()) void load(queryString);
    };
    const timer = setInterval(checkForNewWindow, REFRESH_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkForNewWindow);
    window.addEventListener("focus", checkForNewWindow);
    window.addEventListener("pageshow", checkForNewWindow);

    if (loadedQueryRef.current === queryString) {
      setState(current => current.isLoading ? { ...current, isLoading: false } : current);
      checkForNewWindow();
    } else {
      setState(current => ({ ...current, isLoading: true }));
      debounceRef.current = setTimeout(() => void load(queryString), DEBOUNCE_MS);
    }
    return () => {
      clearTimeout(debounceRef.current);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkForNewWindow);
      window.removeEventListener("focus", checkForNewWindow);
      window.removeEventListener("pageshow", checkForNewWindow);
      controllerRef.current?.abort();
      pendingQueryRef.current = null;
    };
  }, [queryString, load]);

  return { ...state, refresh };
}
