import * as v from "valibot";
import {
  RANGE_OPTIONS,
  INTERVAL_OPTIONS,
  GROUP_BY_OPTIONS,
  MAX_FILTER_VALUES,
} from "./constants";

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

/** Anything past the cap is dropped rather than failing the whole filter. */
const FilterValuesSchema = v.fallback(
  v.pipe(
    v.array(v.string()),
    v.transform((values) => [...new Set(values)].slice(0, MAX_FILTER_VALUES)),
  ),
  [],
);

const DashboardSearchParamsSchema = v.object({
  range: v.fallback(v.picklist(RANGE_OPTIONS), "24h"),
  interval: v.fallback(v.picklist(INTERVAL_OPTIONS), "15m"),
  eventType: FilterValuesSchema,
  page: FilterValuesSchema,
  country: FilterValuesSchema,
  groupBy: v.fallback(v.array(v.picklist(GROUP_BY_OPTIONS)), []),
});

export type DashboardSearchParams = v.InferOutput<
  typeof DashboardSearchParamsSchema
>;
export type DashboardGroupBy = DashboardSearchParams["groupBy"][number];

/** The value filters, one per groupBy dimension. */
export type DashboardFilters = Pick<
  DashboardSearchParams,
  "eventType" | "page" | "country"
>;
export type DashboardFilterParam = keyof DashboardFilters;

/**
 * The value filter that narrows each groupBy dimension. Grouping by a
 * dimension that is already filtered is refused: the filter has picked the
 * values, so there is nothing left to split.
 */
export const GROUP_BY_FILTER_PARAM = {
  event: "eventType",
  page: "page",
  country: "country",
} as const satisfies Record<DashboardGroupBy, DashboardFilterParam>;

/**
 * What each dimension is called on screen. `country` holds the wiki language
 * edition for wiki traffic, so it is shown as a language.
 */
export const DIMENSION_LABELS = {
  event: "event type",
  page: "page",
  country: "language",
} as const satisfies Record<DashboardGroupBy, string>;

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
    page: getMultiSearchParam(searchParams.page),
    country: getMultiSearchParam(searchParams.country),
    groupBy: getMultiSearchParam(searchParams.groupBy),
  });

  // The filters strip their own dimension from groupBy when they are set; this
  // covers a URL that was put together by hand.
  validObject.groupBy = validObject.groupBy
    .filter((groupBy) => !validObject[GROUP_BY_FILTER_PARAM[groupBy]].length)
    .sort();
  validObject.eventType.sort();
  validObject.page.sort();
  validObject.country.sort();

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
 * already-validated filter set. The multi-value params come out sorted (see
 * above), so two filter states that are equal but were built in a different
 * click order still serialise to the same string.
 */
export function serializeDashboardSearchParams(
  params: DashboardSearchParams,
): string {
  const searchParams = new URLSearchParams(serializeDashboardFilters(params));
  searchParams.set("interval", params.interval);
  for (const groupBy of params.groupBy) {
    searchParams.append("groupBy", groupBy);
  }
  return searchParams.toString();
}

/**
 * Range and the value filters only — what decides which events are counted,
 * without interval or groupBy, which only reshape the chart.
 */
export function serializeDashboardFilters(
  params: Pick<DashboardSearchParams, "range"> & DashboardFilters,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("range", params.range);
  for (const name of ["eventType", "page", "country"] as const) {
    for (const value of params[name]) searchParams.append(name, value);
  }
  return searchParams.toString();
}
