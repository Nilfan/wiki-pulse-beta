import "server-only";
import { backendJson } from "./http";
import { serializeDashboardSearchParams, type DashboardSearchParams } from "@/lib/queries/dashboardSearchParams";
import type { EventsSeriesWire } from "@/lib/queries/events";
import type { Insights } from "@/lib/queries/insights";
import type { BreakdownPage, BreakdownDimension } from "@/lib/queries/breakdown";
import type { RecentEvent } from "@/lib/queries/recentEvents";
import type { Heartbeat } from "@/lib/queries/heartbeat";
import type { FeedSnapshot } from "@/lib/queries/feed";
import { BREAKDOWN_PAGE_SIZE } from "@/lib/queries/constants";

function query(params: DashboardSearchParams) {
  return serializeDashboardSearchParams(params);
}

export const getEventsSeries = (params: DashboardSearchParams) =>
  backendJson<EventsSeriesWire>(`/api/dashboard/events?${query(params)}`);
export const getInsights = (params: DashboardSearchParams) =>
  backendJson<Insights>(`/api/dashboard/insights?${query(params)}`);
export const getRecentEvents = (params: DashboardSearchParams) =>
  backendJson<RecentEvent[]>(`/api/dashboard/recent?${query(params)}`);
export const getBreakdownPage = (dimension: BreakdownDimension, params: DashboardSearchParams) =>
  backendJson<BreakdownPage>(`/api/dashboard/breakdown?${query(params)}&dimension=${dimension}&offset=0&limit=${BREAKDOWN_PAGE_SIZE}&facet=1`);
export const getHeartbeat = () => backendJson<Heartbeat>("/api/dashboard/heartbeat");
export const getFeedSnapshot = () => backendJson<FeedSnapshot>("/api/feed");
