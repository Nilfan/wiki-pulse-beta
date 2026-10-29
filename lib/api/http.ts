import "server-only";

/** Server-only configuration: browsers continue to use same-origin /api URLs. */
export function backendUrl(path: string): URL {
  const base = new URL(process.env.BACKEND_API_URL || "https://samson-pulse.org/");
  if (!["http:", "https:"].includes(base.protocol)) {
    throw new Error("BACKEND_API_URL must be an HTTP(S) URL");
  }
  return new URL(path, base);
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  // SSR uses the same local handlers as browser /api requests in development.
  // No HTTP self-request is needed, so this also works on alternate dev ports.
  if (process.env.NODE_ENV === "development") {
    const { NextRequest } = await import("next/server");
    const { dispatchApi } = await import("./dispatch");
    const request = new NextRequest(new Request(new URL(path, "http://localhost"), init));
    const key = request.nextUrl.pathname.replace(/^\/api\//, "");
    return dispatchApi(key as Parameters<typeof dispatchApi>[0], request);
  }
  return fetch(backendUrl(path), {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}

export async function backendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await backendFetch(path, init);
  if (!response.ok) throw new Error(`Backend API failed (${response.status}): ${path.split("?")[0]}`);
  return response.json() as Promise<T>;
}
