"use client";

import { LayoutDashboard, ListTodo, UserCog, Wrench } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const STUDENT_NAV_ITEMS: NavItem[] = [{ href: "/maintenance", label: "My Issues", icon: Wrench }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
};

function has(permissions: readonly string[] | null, key: string): boolean {
  return (permissions ?? []).includes(key);
}

/**
 * MYARCH Maintenance functional hierarchy architecture amendment — the
 * "dedicated Maintenance workspace" the product decision calls for.
 * Composed per-actor rather than a single static array: Secretary and a
 * MAINTENANCE_SECRETARY-flagged Coordinator get the full workspace
 * (Complaints/Dashboard/Tasks/Maintenance Coordinator); an ordinary
 * Coordinator (including one flagged MAINTENANCE_COORDINATOR) sees only
 * the tabs their delegated permissions unlock — display/nav-gating only,
 * mirroring the corresponding server-side canView.../canManage... checks in
 * src/modules/maintenance/domain/permissions.ts; every real authorization
 * decision still happens there, not here.
 *
 * "Reports" (named alongside "Dashboard" in the product decision's tab
 * list) is deliberately not a second tab — GetMaintenanceDashboardStatsUseCase
 * is the one analytics feature that exists, and the product decision's own
 * "only features that actually exist" instruction rules out fabricating a
 * distinct Reports page that would just duplicate it. "Dashboard" is both.
 */
export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const { role, maintenanceRole, permissions } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
    "STUDENT",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  let navItems: NavItem[];
  if (role === "STUDENT") {
    navItems = STUDENT_NAV_ITEMS;
  } else {
    const fullAccess = role === "SECRETARY" || maintenanceRole === "MAINTENANCE_SECRETARY";
    const canManage = fullAccess || has(permissions, "maintenance.manage");

    navItems = [{ href: "/maintenance", label: "Complaints", icon: Wrench }];

    if (canManage || has(permissions, "maintenance.view") || has(permissions, "maintenance.reports")) {
      navItems.push({ href: "/maintenance/dashboard", label: "Dashboard", icon: LayoutDashboard });
    }
    if (canManage || has(permissions, "maintenance.tasks")) {
      navItems.push({ href: "/maintenance/tasks", label: "Tasks", icon: ListTodo });
    }
    if (fullAccess || maintenanceRole === "MAINTENANCE_COORDINATOR") {
      navItems.push({ href: "/maintenance/coordinator", label: "Maintenance Coordinator", icon: UserCog });
    }
  }

  return (
    <SheetLayout navItems={navItems} roleLabel={ROLE_LABELS[role ?? ""] ?? "Maintenance"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
