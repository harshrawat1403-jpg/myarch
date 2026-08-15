"use client";

import { CalendarDays } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/calendar", label: "Calendar", icon: CalendarDays }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  ALUMNI: "Alumni",
};

/**
 * MYARCH Phase 3 (§4.1) — Central Activity Calendar UI, reachable by every
 * role (visibility per entry is entirely delegated to each registered
 * CalendarSource's own authorization server-side — see
 * GetCalendarEntriesUseCase). Its own thin route group, mirroring tasks'/
 * maintenance's own shape from Phase 2.
 */
export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
    "STUDENT",
    "RECRUITER",
    "ALUMNI",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Calendar"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
