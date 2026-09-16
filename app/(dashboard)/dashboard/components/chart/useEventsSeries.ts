"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventsSeriesWirePoint } from "@/lib/queries/events";
import { revalidateDashboardData } from "../../actions";

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
 * How often the series on screen is refetched in the background so the chart
 * keeps up with newly collected events without a page reload.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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
 *
 * On top of that the current series is refetched every
 * {@link REFRESH_INTERVAL_MS}. That refresh is silent — the chart does not dim
 * — it skips ticks while the tab is hidden, and a filter change restarts the
 * interval and aborts a refresh that is still in flight.
 *
 * `refresh` is the manual version: it first drops the server-side cache for
 * the org, so the refetch reads the database rather than the cached entry, and
 * dims the chart like a filter change does.
 */
export default function useEventsSeries(
  queryString: string,
  initialState: EventsSeriesState,
): EventsSeriesState & { refresh: () => Promise<void> } {
  const [state, setState] = useState(initialState);
  // The filters the series currently on screen belongs to. Starts as whatever
  // the server rendered, so the first mount reuses that data rather than
  // immediately asking for it again, and moves only when a response lands.
  const loadedQueryStringRef = useRef(queryString);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // Latest filters, for a manual refresh that resolves after they have moved.
  const queryStringRef = useRef(queryString);

  const load = useCallback((targetQueryString: string) => {
    // A debounced request still waiting would only repeat this one.
    clearTimeout(debounceTimerRef.current);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/dashboard/events?${targetQueryString}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Events request failed: ${response.status}`);
        }
        return response.json() as Promise<EventsSeriesResponse>;
      })
      .then(({ events, untilMs }) => {
        loadedQueryStringRef.current = targetQueryString;
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
  }, []);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));

    try {
      await revalidateDashboardData();
    } catch (error) {
      // Still worth refetching: the cached entry may have expired on its own.
      console.error("Failed to revalidate the dashboard cache", error);
    }

    load(queryStringRef.current);
  }, [load]);

  useEffect(() => {
    queryStringRef.current = queryString;

    // Background refresh of whatever the filters currently are. Skipped while
    // the tab is hidden so an idle tab does not keep hitting the API.
    const refreshTimer = setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      load(queryString);
    }, REFRESH_INTERVAL_MS);

    if (queryString === loadedQueryStringRef.current) {
      // Already showing exactly this series. Reached either on first mount or
      // when the filters return to where they started while the request for
      // the detour was still in flight — that one has just been aborted by
      // this effect's previous cleanup, and nothing needs to replace it.
      setState((current) =>
        current.isLoading ? { ...current, isLoading: false } : current,
      );
      return () => {
        clearInterval(refreshTimer);
        abortRef.current?.abort();
      };
    }

    setState((current) => ({ ...current, isLoading: true }));

    debounceTimerRef.current = setTimeout(() => load(queryString), DEBOUNCE_MS);

    // Runs before the next effect and on unmount: drops a request that has
    // not gone out yet, and cancels one that has.
    return () => {
      clearTimeout(debounceTimerRef.current);
      clearInterval(refreshTimer);
      abortRef.current?.abort();
    };
  }, [queryString, load]);

  return { ...state, refresh };
}
