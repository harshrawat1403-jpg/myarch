import type { Metadata } from "next";
import { AuthProvider } from "@/modules/auth/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "TNPArch — Department Training & Placement Portal",
  description: "Department of Architecture & Planning, VNIT Nagpur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
