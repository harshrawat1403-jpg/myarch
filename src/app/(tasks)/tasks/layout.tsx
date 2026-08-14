"use client";

import { ListTodo } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/tasks", label: "Tasks", icon: ListTodo }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
};

/**
 * MYARCH Phase 2 (§3.8) — Task/Follow-up Engine UI, reachable by every role
 * with any task capability (Secretary, Coordinator, Student). Deliberately
 * its own thin route group rather than living inside (admin)/(student) —
 * the same task list/detail views serve all three roles (each scoped
 * server-side by SearchTasksUseCase/canViewTask), so one shared shell here
 * avoids duplicating the page twice under two different role-specific
 * layouts.
 */
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
    "STUDENT",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Tasks"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
