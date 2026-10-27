import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { DashboardSearchParams } from "./dashboardSearchParams";
import { getEventFiltersSql } from "./eventFilters";
import type { TimeWindow } from "./events";

export type RecentEvent = { id: string; timestamp: string; type: string; path: string; host: string; country: string | null };
export const RECENT_EVENTS_LIMIT = 50;
export const CSV_EVENTS_LIMIT = 5000;

/** Bounded, filtered snapshot using the same half-open window as the chart. */
export async function getRecentEvents(orgId: string, params: DashboardSearchParams, window: TimeWindow, limit = RECENT_EVENTS_LIMIT): Promise<RecentEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org:${orgId}`);
  const rows = await prisma.$queryRaw<{ id: bigint; timestamp: Date; type: string; path: string; host: string; country: string | null }[]>`
    SELECT e."id", e."timestamp", e."type", e."path", e."host", e."country"
    FROM "Event" e
    WHERE e."org_id" = ${orgId}::bigint
      AND e."timestamp" >= ${window.since}
      AND e."timestamp" < ${window.until}
      ${getEventFiltersSql(params)}
    ORDER BY e."timestamp" DESC, e."id" DESC
    LIMIT ${Math.min(Math.max(1, limit), CSV_EVENTS_LIMIT)}
  `;
  return rows.map(row => ({ ...row, id: row.id.toString(), timestamp: row.timestamp.toISOString() }));
}
