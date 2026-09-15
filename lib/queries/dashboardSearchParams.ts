import * as v from "valibot";
import { RANGE_OPTIONS, INTERVAL_OPTIONS, GROUP_BY_OPTIONS } from "./constants";

/**
 * Pure parsing/serialising for the dashboard's filter query string. Kept
 * apart from `./events` (which imports Prisma) so client components — the
 * chart's own refetch hook, in particular — can read and build these query
 * strings without pulling the database layer into the browser bundle.
 */

export type DashboardSearchParamsInput = Record<
  string,
  string | string[] | undefined
>;

const DashboardSearchParamsSchema = v.object({
  range: v.fallback(v.picklist(RANGE_OPTIONS), "24h"),
  interval: v.fallback(v.picklist(INTERVAL_OPTIONS), "15m"),
  eventType: v.fallback(v.array(v.string()), []),
  groupBy: v.fallback(v.array(v.picklist(GROUP_BY_OPTIONS)), []),
});

export type DashboardSearchParams = v.InferOutput<
  typeof DashboardSearchParamsSchema
>;
export type DashboardGroupBy = DashboardSearchParams["groupBy"][number];

function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function getMultiSearchParam(value: string | string[] | undefined) {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value : undefined;
}

export function parseDashboardSearchParams(
  searchParams: DashboardSearchParamsInput,
): DashboardSearchParams {
  const validObject = v.parse(DashboardSearchParamsSchema, {
    range: getSingleSearchParam(searchParams.range),
    interval: getSingleSearchParam(searchParams.interval),
    eventType: getMultiSearchParam(searchParams.eventType),
    groupBy: getMultiSearchParam(searchParams.groupBy),
  });

  validObject.groupBy.sort();
  validObject.eventType.sort();

  return validObject;
}

/**
 * Turns a `URLSearchParams` (from `request.nextUrl.searchParams` on the
 * server, or `useSearchParams()` on the client — both implement the same
 * interface) into the `{ key: string | string[] }` shape Next.js hands a
 * page's `searchParams` prop, so both read a query string identically to
 * `parseDashboardSearchParams`.
 */
export function searchParamsFromURLSearchParams(
  searchParams: URLSearchParams,
): DashboardSearchParamsInput {
  const input: DashboardSearchParamsInput = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    input[key] = values.length > 1 ? values : values[0];
  }
  return input;
}

/**
 * Inverse of `parseDashboardSearchParams`: a canonical query string for an
 * already-validated filter set. `eventType`/`groupBy` come out sorted (see
 * above), so two filter states that are equal but were built in a different
 * click order still serialise to the same string.
 */
export function serializeDashboardSearchParams(
  params: DashboardSearchParams,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("range", params.range);
  searchParams.set("interval", params.interval);
  for (const eventType of params.eventType) {
    searchParams.append("eventType", eventType);
  }
  for (const groupBy of params.groupBy) {
    searchParams.append("groupBy", groupBy);
  }
  return searchParams.toString();
}
