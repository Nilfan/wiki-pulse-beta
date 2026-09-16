import type {
  BreakdownDimension,
  BreakdownPage,
  BreakdownRow,
} from "@/lib/queries/breakdown";

export type BreakdownRequest = {
  offset: number;
  limit: number;
  /** Pins the snapshot a first page was counted against. */
  untilMs?: number;
  search?: string;
  /** Ignore the dimension's own filter — for a filter's options. */
  facet?: boolean;
};

export function fetchBreakdownPage(
  dimension: BreakdownDimension,
  queryString: string,
  request: BreakdownRequest,
  signal: AbortSignal,
) {
  const query = new URLSearchParams(queryString);
  query.set("dimension", dimension);
  query.set("offset", String(request.offset));
  query.set("limit", String(request.limit));
  if (request.untilMs !== undefined) {
    query.set("until", String(request.untilMs));
  }
  if (request.search) query.set("q", request.search);
  if (request.facet) query.set("facet", "1");

  return fetch(`/api/dashboard/breakdown?${query}`, { signal }).then(
    (response) => {
      if (!response.ok) {
        throw new Error(`Breakdown request failed: ${response.status}`);
      }
      return response.json() as Promise<BreakdownPage>;
    },
  );
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Rows arriving after the snapshot moved (a late-ingested event can shift a
 * rank) may repeat one already on screen; React keys need them unique.
 */
export function appendBreakdownRows(
  rows: readonly BreakdownRow[],
  next: readonly BreakdownRow[],
) {
  const seen = new Set(rows.map(({ value }) => value));
  return [...rows, ...next.filter(({ value }) => !seen.has(value))];
}
