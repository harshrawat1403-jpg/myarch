import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Minimal, self-contained production server bundle (.next/standalone) —
  // the Docker image (see Dockerfile) copies only this output plus static
  // assets, rather than the full node_modules tree, keeping the production
  // image small and avoiding dev-only dependencies at runtime.
  output: "standalone",
  images: {
    // Portfolio/resume assets are served from object storage via signed URLs
    // (see docs/architecture/06_Technology_Stack.md). Remote patterns are
    // intentionally left unconfigured until the storage provider is finalized.
    remotePatterns: [],
  },
};

export default nextConfig;
