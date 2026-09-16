import { Prisma } from "@/generated/prisma/client";
import { WIKI_LANGUAGE_NAMES } from "@/lib/labels/wikiLanguageNames";
import type {
  DashboardFilters,
  DashboardGroupBy,
} from "./dashboardSearchParams";

/**
 * SQL for each dimension, keyed by the validated picklist value so the
 * fragments are never built from user input. Shared by the chart's groupBy,
 * the breakdown lists and the value filters, so all three agree on what a
 * value is — a missing country is "unknown" everywhere.
 */
export const DIMENSION_SQL: Record<DashboardGroupBy, string> = {
  event: 'e."type"',
  page: 'e."path"',
  country: `COALESCE(e."country", 'unknown')`,
};

/** `AND` clauses for the value filters, to follow a `WHERE` on `"Event" e`. */
export function getEventFiltersSql({
  eventType,
  page,
  country,
}: DashboardFilters): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (eventType.length) {
    clauses.push(
      Prisma.sql`AND ${Prisma.raw(DIMENSION_SQL.event)} = ANY(${eventType}::text[])`,
    );
  }
  if (page.length) {
    clauses.push(
      Prisma.sql`AND ${Prisma.raw(DIMENSION_SQL.page)} = ANY(${page}::text[])`,
    );
  }
  if (country.length) {
    clauses.push(
      Prisma.sql`AND ${Prisma.raw(DIMENSION_SQL.country)} = ANY(${country}::text[])`,
    );
  }

  return clauses.length ? Prisma.join(clauses, " ") : Prisma.empty;
}

/** Substring pattern for ILIKE, with the user's own wildcards taken literally. */
function toContainsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

/**
 * `AND` clause matching a search against what the dropdown shows, not just
 * what is stored:
 *
 * - paths are stored percent-encoded with underscores for spaces, so
 *   "Café de Flore" also looks for "Caf%C3%A9_de_Flore";
 * - wiki languages are stored as codes, so "arabic" also matches every code
 *   whose language name contains it.
 */
export function getSearchSql(
  dimension: DashboardGroupBy,
  search: string,
): Prisma.Sql {
  if (!search) return Prisma.empty;

  const column = Prisma.raw(DIMENSION_SQL[dimension]);
  const patterns = new Set([toContainsPattern(search)]);
  const conditions: Prisma.Sql[] = [];

  if (dimension === "page") {
    const underscored = search.replace(/ /g, "_");
    patterns.add(toContainsPattern(underscored));
    try {
      patterns.add(toContainsPattern(encodeURI(underscored)));
    } catch {
      // A lone surrogate cannot be encoded; the plain patterns still apply.
    }
  }

  if (dimension === "country") {
    const needle = search.toLowerCase();
    const codes = new Set<string>();
    for (const [code, name] of Object.entries(WIKI_LANGUAGE_NAMES)) {
      if (name.toLowerCase().includes(needle)) codes.add(code);
    }
    if (codes.size) {
      conditions.push(
        Prisma.sql`lower(${column}) = ANY(${[...codes]}::text[])`,
      );
    }
  }

  for (const pattern of patterns) {
    conditions.push(Prisma.sql`${column} ILIKE ${pattern}`);
  }

  return Prisma.sql`AND (${Prisma.join(conditions, " OR ")})`;
}
