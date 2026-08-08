import type { MetadataRoute } from "next";

/**
 * Next.js's manifest file-convention — auto-served at `/manifest.webmanifest`
 * and linked into `<head>`, no manual `<link rel="manifest">` needed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TNPArch — Department Training & Placement Portal",
    short_name: "TNPArch",
    description: "Department of Architecture & Planning, VNIT Nagpur",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#6c5ce7",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
