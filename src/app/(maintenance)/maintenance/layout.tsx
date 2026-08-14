"use client";

import { Wrench, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const STAFF_NAV_ITEMS: NavItem[] = [
  { href: "/maintenance", label: "Issues", icon: Wrench },
  { href: "/maintenance/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
const STUDENT_NAV_ITEMS: NavItem[] = [{ href: "/maintenance", label: "My Issues", icon: Wrench }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
};

/**
 * MYARCH Phase 2 (§3.1–§3.6, §3.9) — Maintenance UI, its own thin route
 * group (not nested inside (admin)/(student)) since the same list/detail
 * views serve Secretary, Coordinator, and Student alike, each scoped
 * server-side by SearchMaintenanceIssuesUseCase/canViewMaintenanceIssue —
 * mirrors the (tasks) route group's own identical reasoning.
 */
export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
    "STUDENT",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  const navItems = role === "STUDENT" ? STUDENT_NAV_ITEMS : STAFF_NAV_ITEMS;

  return (
    <SheetLayout navItems={navItems} roleLabel={ROLE_LABELS[role ?? ""] ?? "Maintenance"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
