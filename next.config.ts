import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    useCache: true,
  },
};

export default nextConfig;
