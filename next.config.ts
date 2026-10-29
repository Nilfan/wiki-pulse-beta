import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    const upstream = new URL(process.env.ASSISTANT_INTERNAL_URL || "http://127.0.0.1:3001");
    if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password || upstream.search || upstream.hash || upstream.pathname !== "/") {
      throw new Error("ASSISTANT_INTERNAL_URL must be an HTTP(S) origin without credentials, path, query, or fragment");
    }
    return [{ source: "/api/assistant-ws", destination: new URL("/ws/assistant", upstream).href }];
  },
  experimental: {
    useCache: true,
  },
};

export default nextConfig;
