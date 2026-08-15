"use client";

import { Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/meetings", label: "Meetings", icon: Users }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
};

/** MYARCH Phase 3 (§4.4) — Meeting Management UI. Unlike Events, a meeting has no public/published state — only whoever manages it or is a listed participant ever sees it (canViewMeeting), so this route group is scoped to on-campus staff/student roles only (Recruiter/Alumni excluded — meetings aren't addressed to them). */
export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
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
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Meetings"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
