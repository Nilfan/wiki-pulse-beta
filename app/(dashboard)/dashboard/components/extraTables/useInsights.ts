"use client";

import { useEffect, useRef, useState } from "react";
import type { Insights } from "@/lib/queries/insights";

export type InsightsState = {
  insights: Insights;
  isLoading: boolean;
};

/** Same pacing as the chart, so both settle on a filter change together. */
const DEBOUNCE_MS = 350;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Keeps the insights strip in step with the filters. A pared-down
 * useEventsSeries: debounced, aborts whatever it superseded, keeps the last
 * figures on screen while the next ones load, and refetches silently in the
 * background while the tab is visible.
 */
export default function useInsights(
  queryString: string,
  initialInsights: Insights,
): InsightsState {
  const [state, setState] = useState<InsightsState>({
    insights: initialInsights,
    isLoading: false,
  });
  // The filters the figures on screen belong to; starts as the server render.
  const loadedQueryStringRef = useRef(queryString);

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = () => {
      controller?.abort();
      controller = new AbortController();

      fetch(`/api/dashboard/insights?${queryString}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Insights request failed: ${response.status}`);
          }
          return response.json() as Promise<Insights>;
        })
        .then((insights) => {
          loadedQueryStringRef.current = queryString;
          setState({ insights, isLoading: false });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          console.error("Failed to load insights", error);
          setState((current) => ({ ...current, isLoading: false }));
        });
    };

    const refreshTimer = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, REFRESH_INTERVAL_MS);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    if (queryString === loadedQueryStringRef.current) {
      setState((current) =>
        current.isLoading ? { ...current, isLoading: false } : current,
      );
    } else {
      setState((current) => ({ ...current, isLoading: true }));
      debounceTimer = setTimeout(load, DEBOUNCE_MS);
    }

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, [queryString]);

  return state;
}
