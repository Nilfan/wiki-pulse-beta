"use client";

import { useEffect, useRef, useState } from "react";
import type { EventsSeriesWirePoint } from "@/lib/queries/events";

export type EventsSeriesState = {
  events: EventsSeriesWirePoint[];
  untilMs: number;
  isLoading: boolean;
};

type EventsSeriesResponse = {
  events: EventsSeriesWirePoint[];
  untilMs: number;
};

/**
 * How long the filters have to hold still before a request goes out. Long
 * enough to swallow a burst of clicks through a filter menu, short enough
 * that a single deliberate change still feels immediate.
 */
const DEBOUNCE_MS = 350;

/**
 * Keeps the chart's series in step with the filter query string.
 *
 * Two guards, both of which the bare navigation-driven refetch lacked:
 *
 * - **Debounce.** Each change to `queryString` restarts the timer, so
 *   clicking through several filters fires one request instead of one per
 *   click.
 * - **Abort.** Whatever is in flight is aborted the moment the filters move
 *   again. Without this a slow response for the filters you just left can
 *   land after the fast response for the ones you are on, and the chart ends
 *   up showing a series that matches neither — the "filters get confused"
 *   symptom.
 *
 * The last good series stays on screen while the next one loads, so the chart
 * dims rather than collapsing to an empty frame.
 */
export default function useEventsSeries(
  queryString: string,
  initialState: EventsSeriesState,
): EventsSeriesState {
  const [state, setState] = useState(initialState);
  // The filters the series currently on screen belongs to. Starts as whatever
  // the server rendered, so the first mount reuses that data rather than
  // immediately asking for it again, and moves only when a response lands.
  const loadedQueryStringRef = useRef(queryString);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (queryString === loadedQueryStringRef.current) {
      // Already showing exactly this series. Reached either on first mount or
      // when the filters return to where they started while the request for
      // the detour was still in flight — that one has just been aborted by
      // this effect's previous cleanup, and nothing needs to replace it.
      setState((current) =>
        current.isLoading ? { ...current, isLoading: false } : current,
      );
      return;
    }

    setState((current) => ({ ...current, isLoading: true }));

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/dashboard/events?${queryString}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Events request failed: ${response.status}`);
          }
          return response.json() as Promise<EventsSeriesResponse>;
        })
        .then(({ events, untilMs }) => {
          loadedQueryStringRef.current = queryString;
          setState({ events, untilMs, isLoading: false });
        })
        .catch((error: unknown) => {
          // An abort is this hook superseding itself, not a failure.
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          console.error("Failed to load the events series", error);
          setState((current) => ({ ...current, isLoading: false }));
        });
    }, DEBOUNCE_MS);

    // Runs before the next effect and on unmount: drops a request that has
    // not gone out yet, and cancels one that has.
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [queryString]);

  return state;
}
