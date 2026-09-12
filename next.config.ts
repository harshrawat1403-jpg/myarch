import type { NextConfig } from "next";

const isVercelBuild = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel performs its own output tracing and function packaging. Docker and
  // other self-hosted targets retain the minimal standalone server bundle.
  ...(isVercelBuild ? {} : { output: "standalone" }),
  images: {
    // Portfolio/resume assets are served from object storage via signed URLs
    // (see docs/architecture/06_Technology_Stack.md). Remote patterns are
    // intentionally left unconfigured until the storage provider is finalized.
    remotePatterns: [],
  },
};

export default nextConfig;
