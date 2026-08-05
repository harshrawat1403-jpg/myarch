"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { SheetLayout } from "@/components/sheet-layout";

const NAV_ITEMS = [{ href: "/recruiter", label: "Student Directory" }] as const;

/**
 * Route protection for the entire (recruiter) segment — Recruiter role
 * only. This layout, and every page under it, is intentionally isolated
 * from the (admin) segment: it shares only presentational primitives
 * (SheetLayout, Button, Table, …) and the generic useAuth() session hook,
 * never an admin data-fetching path or component.
 */
export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, role, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || role !== "RECRUITER") {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading || !isAuthenticated || role !== "RECRUITER") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[--color-background] text-[--color-text-secondary]">
        <p className="font-[family-name:var(--font-data)] text-sm">Loading…</p>
      </main>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel="Recruiter" onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
