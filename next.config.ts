import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Portfolio/resume assets are served from object storage via signed URLs
    // (see docs/architecture/06_Technology_Stack.md). Remote patterns are
    // intentionally left unconfigured until the storage provider is finalized.
    remotePatterns: [],
  },
};

export default nextConfig;
