"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { SheetLayout } from "@/components/sheet-layout";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/students", label: "Students" },
  { href: "/dashboard/batches", label: "Batches" },
  { href: "/dashboard/approvals", label: "Approvals" },
  { href: "/dashboard/exports", label: "Exports" },
  { href: "/dashboard/audit", label: "Audit" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Secretary",
  COORDINATOR: "Coordinator",
};

/**
 * Route protection for the whole (admin) segment — everything under it is
 * Secretary/Coordinator only, matching every dashboard route handler's own
 * `withAuth({ roles: ["SECRETARY", "COORDINATOR"] })` gate. This is a UX
 * convenience (redirect before rendering a page that would just get 403s
 * back from every fetch); the real authorization is still enforced
 * server-side on every API call underneath, exactly as
 * docs/security/14_Security_Architecture.md requires — this layout never
 * substitutes for that.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, role, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (role !== "SECRETARY" && role !== "COORDINATOR") {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading || !isAuthenticated || (role !== "SECRETARY" && role !== "COORDINATOR")) {
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
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role] ?? role} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
