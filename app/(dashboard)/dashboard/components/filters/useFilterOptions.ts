"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BreakdownRow } from "@/lib/queries/breakdown";
import type { DashboardGroupBy } from "@/lib/queries/dashboardSearchParams";
import { BREAKDOWN_PAGE_SIZE } from "@/lib/queries/constants";
import {
  appendBreakdownRows,
  fetchBreakdownPage,
  isAbortError,
} from "../extraTables/breakdown/fetchBreakdownPage";

type FilterOptionsState = {
  rows: BreakdownRow[];
  groupCount: number;
  untilMs: number | undefined;
  /** The request the rows on screen answer; null before the first one lands. */
  requestKey: string | null;
  /** The request whose first page failed, if any. */
  errorKey: string | null;
  isLoadingMore: boolean;
  hasLoadMoreError: boolean;
};

const INITIAL_STATE: FilterOptionsState = {
  rows: [],
  groupCount: 0,
  untilMs: undefined,
  requestKey: null,
  errorKey: null,
  isLoadingMore: false,
  hasLoadMoreError: false,
};

/**
 * A value filter's options, busiest first, while its dropdown is open.
 *
 * Refetched on every open, so the options follow the other filters and the
 * range; the server-side cache keeps that cheap. `search` is expected to be
 * debounced already. Faceted: the dimension's own selection does not narrow
 * its options.
 */
export default function useFilterOptions(
  dimension: DashboardGroupBy,
  /** Range and value filters, as serializeDashboardFilters writes them. */
  filtersQueryString: string,
  search: string,
  isOpen: boolean,
) {
  const [state, setState] = useState<FilterOptionsState>(INITIAL_STATE);
  const [attempt, setAttempt] = useState(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const requestKey = `${filtersQueryString}\u0000${search}`;

  useEffect(() => {
    if (!isOpen) return;

    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    const controller = new AbortController();

    fetchBreakdownPage(
      dimension,
      filtersQueryString,
      { offset: 0, limit: BREAKDOWN_PAGE_SIZE, search, facet: true },
      controller.signal,
    )
      .then((page) => {
        setState({
          rows: page.rows,
          groupCount: page.groupCount,
          untilMs: page.untilMs,
          requestKey,
          errorKey: null,
          isLoadingMore: false,
          hasLoadMoreError: false,
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;

        console.error(`Failed to load ${dimension} filter options`, error);
        setState((current) => ({ ...current, errorKey: requestKey }));
      });

    return () => controller.abort();
  }, [dimension, filtersQueryString, search, requestKey, isOpen, attempt]);

  const loadMore = useCallback(() => {
    const current = stateRef.current;
    if (
      loadMoreControllerRef.current ||
      current.requestKey !== requestKey ||
      current.rows.length >= current.groupCount
    ) {
      return;
    }

    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setState((previous) => ({
      ...previous,
      isLoadingMore: true,
      hasLoadMoreError: false,
    }));

    fetchBreakdownPage(
      dimension,
      filtersQueryString,
      {
        offset: current.rows.length,
        limit: BREAKDOWN_PAGE_SIZE,
        untilMs: current.untilMs,
        search,
        facet: true,
      },
      controller.signal,
    )
      .then((page) => {
        setState((previous) => ({
          ...previous,
          rows: appendBreakdownRows(previous.rows, page.rows),
          groupCount: page.rows.length
            ? previous.groupCount
            : previous.rows.length,
          isLoadingMore: false,
        }));
      })
      .catch((error: unknown) => {
        const isAbort = isAbortError(error);
        if (!isAbort) {
          console.error(
            `Failed to load more ${dimension} filter options`,
            error,
          );
        }
        setState((previous) => ({
          ...previous,
          isLoadingMore: false,
          hasLoadMoreError: !isAbort,
        }));
      })
      .finally(() => {
        if (loadMoreControllerRef.current === controller) {
          loadMoreControllerRef.current = null;
        }
      });
  }, [dimension, filtersQueryString, search, requestKey]);

  useEffect(() => () => loadMoreControllerRef.current?.abort(), []);

  /** Repeats whichever request failed: the first page, or the next one. */
  const retry = useCallback(() => {
    if (stateRef.current.requestKey === requestKey) {
      loadMore();
    } else {
      setState((current) => ({ ...current, errorKey: null }));
      setAttempt((count) => count + 1);
    }
  }, [loadMore, requestKey]);

  const hasFirstPageError = state.errorKey === requestKey;

  return {
    rows: state.rows,
    requestKey: state.requestKey,
    isLoadingMore: state.isLoadingMore,
    /**
     * The rows on screen answer an earlier search or filter set (or nothing
     * yet), and the request for the current one is still out.
     */
    isLoading: state.requestKey !== requestKey && !hasFirstPageError,
    /** The rows on screen answer an earlier search or filter set. */
    isStale: state.requestKey !== requestKey,
    hasError:
      hasFirstPageError ||
      (state.requestKey === requestKey && state.hasLoadMoreError),
    hasMore: state.rows.length < state.groupCount,
    loadMore,
    retry,
  };
}
