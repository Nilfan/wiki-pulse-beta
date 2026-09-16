"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BreakdownDimension,
  BreakdownPage,
  BreakdownRow,
} from "@/lib/queries/breakdown";
import {
  appendBreakdownRows,
  fetchBreakdownPage,
  isAbortError,
} from "./fetchBreakdownPage";
import {
  BREAKDOWN_MAX_LIMIT,
  BREAKDOWN_PAGE_SIZE,
} from "@/lib/queries/constants";

export type BreakdownState = {
  rows: BreakdownRow[];
  total: number;
  groupCount: number;
  untilMs: number;
  /** The filters the rows on screen belong to. */
  queryString: string;
  /** A filter change is out; the rows on screen are the previous filters'. */
  isLoading: boolean;
  isLoadingMore: boolean;
  /** The last page request failed; loading more waits for a retry. */
  hasLoadMoreError: boolean;
};

/** Same pacing as the chart and insights, so everything settles together. */
const DEBOUNCE_MS = 350;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A ranked list that grows as it is scrolled. A filter change is debounced and
 * starts over from the first page; later pages pin the `until` of the first,
 * so the whole list ranks a single snapshot. The background refresh reloads
 * everything scrolled through so far in one request, keeping the scroll put.
 *
 * Faceted: the dimension's own filter does not narrow the list, so picking a
 * value only highlights its row. `queryString` is expected to leave that
 * filter out, so a pick does not refetch either.
 */
export default function useBreakdown(
  dimension: BreakdownDimension,
  queryString: string,
  initialPage: BreakdownPage,
) {
  const [state, setState] = useState<BreakdownState>(() => ({
    rows: initialPage.rows,
    total: initialPage.total,
    groupCount: initialPage.groupCount,
    untilMs: initialPage.untilMs,
    queryString,
    isLoading: false,
    isLoadingMore: false,
    hasLoadMoreError: false,
  }));
  // Read by the callbacks below without re-creating them on every page.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let controller: AbortController | null = null;

    const replace = (paging: { offset: number; limit: number }) => {
      controller?.abort();
      // Whatever page was on its way belongs to the list being replaced.
      loadMoreControllerRef.current?.abort();
      loadMoreControllerRef.current = null;
      controller = new AbortController();

      fetchBreakdownPage(
        dimension,
        queryString,
        { ...paging, facet: true },
        controller.signal,
      )
        .then((page) => {
          setState({
            rows: page.rows,
            total: page.total,
            groupCount: page.groupCount,
            untilMs: page.untilMs,
            queryString,
            isLoading: false,
            isLoadingMore: false,
            hasLoadMoreError: false,
          });
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;

          console.error(`Failed to load ${dimension} breakdown`, error);
          setState((current) => ({ ...current, isLoading: false }));
        });
    };

    const refreshTimer = setInterval(() => {
      if (document.visibilityState === "hidden") return;

      // Rounded up to whole pages, so a refresh lands on page-aligned cache
      // entries and the next scroll carries on from a page boundary.
      const loaded = stateRef.current.rows.length;
      const limit = Math.min(
        Math.max(1, Math.ceil(loaded / BREAKDOWN_PAGE_SIZE)) *
          BREAKDOWN_PAGE_SIZE,
        BREAKDOWN_MAX_LIMIT,
      );
      replace({ offset: 0, limit });
    }, REFRESH_INTERVAL_MS);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    if (queryString === stateRef.current.queryString) {
      setState((current) =>
        current.isLoading ? { ...current, isLoading: false } : current,
      );
    } else {
      setState((current) => ({ ...current, isLoading: true }));
      debounceTimer = setTimeout(
        () => replace({ offset: 0, limit: BREAKDOWN_PAGE_SIZE }),
        DEBOUNCE_MS,
      );
    }

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, [dimension, queryString]);

  const loadMore = useCallback(() => {
    const current = stateRef.current;
    // The ref, not state: two scroll events can call this before a re-render.
    if (
      loadMoreControllerRef.current ||
      current.isLoading ||
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
      current.queryString,
      {
        offset: current.rows.length,
        limit: BREAKDOWN_PAGE_SIZE,
        untilMs: current.untilMs,
        facet: true,
      },
      controller.signal,
    )
      .then((page) => {
        setState((previous) => ({
          ...previous,
          rows: appendBreakdownRows(previous.rows, page.rows),
          // A page that came back short means the snapshot had fewer groups
          // than first counted; stop there rather than asking forever.
          groupCount: page.rows.length
            ? previous.groupCount
            : previous.rows.length,
          isLoadingMore: false,
        }));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          setState((previous) => ({ ...previous, isLoadingMore: false }));
          return;
        }

        console.error(
          `Failed to load more of the ${dimension} breakdown`,
          error,
        );
        setState((previous) => ({
          ...previous,
          isLoadingMore: false,
          hasLoadMoreError: true,
        }));
      })
      .finally(() => {
        if (loadMoreControllerRef.current === controller) {
          loadMoreControllerRef.current = null;
        }
      });
  }, [dimension]);

  useEffect(() => () => loadMoreControllerRef.current?.abort(), []);

  return { ...state, hasMore: state.rows.length < state.groupCount, loadMore };
}
