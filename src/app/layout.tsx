import type { Metadata, Viewport } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/modules/auth/client";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

/**
 * Version 2.0: the design system has named `--font-display` / `--font-body`
 * / `--font-data` since the V1.1 token rewrite, but nothing ever actually
 * loaded "General Sans" / "IBM Plex Sans" / "IBM Plex Mono" — no
 * `next/font`, no stylesheet `<link>`, no `@font-face`. Every page has been
 * silently rendering in the browser's default system font this entire
 * time. Fixed here: `next/font/google` self-hosts real font files and
 * exposes each as a CSS variable, which `tokens.css` now points the
 * existing semantic names at — so every component keeps reading
 * `--font-display` etc. unchanged. "General Sans" itself isn't on Google
 * Fonts (no concrete replacement was ever specified), so the display role
 * moves to Sora — a geometric sans with real presence at large heading
 * sizes — while keeping IBM Plex Sans/Mono for body/data, which were
 * already the right call, just never wired up.
 */
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "TNPArch — Department Training & Placement Portal",
  description: "Department of Architecture & Planning, VNIT Nagpur",
  // `favicon.ico` / `icon.png` / `apple-icon.png` and `opengraph-image.png` /
  // `twitter-image.png`, all under `src/app/`, are Next's own file-convention
  // icons — auto-detected and linked into `<head>` without listing them here.
};

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
