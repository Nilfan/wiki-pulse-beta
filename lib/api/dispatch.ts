import "server-only";
import type { NextRequest } from "next/server";
import { backendFetch } from "./http";

// Dynamic imports keep database initialization out of the frontend process.
const handlers = {
  feed: () => import("@/lib/backend/feed"),
  "dashboard/events": () => import("@/lib/backend/dashboard-events"),
  "dashboard/insights": () => import("@/lib/backend/dashboard-insights"),
  "dashboard/breakdown": () => import("@/lib/backend/dashboard-breakdown"),
  "dashboard/recent": () => import("@/lib/backend/dashboard-recent"),
  "dashboard/heartbeat": () => import("@/lib/backend/dashboard-heartbeat"),
  "dashboard/revalidate": () => import("@/lib/backend/dashboard-revalidate"),
};

export async function dispatchApi(
  key: keyof typeof handlers,
  request: NextRequest,
): Promise<Response> {
  // Frontend pages are always available; only local database handlers opt in.
  const role = process.env.APP_ROLE || "frontend";
  if (role !== "frontend" && role !== "backend")
    throw new Error("APP_ROLE must be frontend or backend");
  if (role === "backend") {
    const loaded = await handlers[key]();
    const handler = (
      loaded as unknown as Record<
        string,
        (request: NextRequest) => Promise<Response>
      >
    )[request.method];
    return handler ? handler(request) : new Response(null, { status: 405 });
  }

  try {
    const headers = new Headers();
    for (const name of ["content-type", "user-agent", "x-vercel-ip-country"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await backendFetch(
      `/api/${key}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD", "OPTIONS"].includes(request.method)
          ? undefined
          : await request.arrayBuffer(),
      },
    );
    const outgoing = new Headers();
    for (const name of [
      "content-type",
      "content-disposition",
      "x-export-limit",
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-headers",
    ]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    outgoing.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch {
    return Response.json({ error: "Backend API unavailable" }, { status: 502 });
  }
}
