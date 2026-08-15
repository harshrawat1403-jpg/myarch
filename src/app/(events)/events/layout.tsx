"use client";

import { CalendarRange } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/events", label: "Events", icon: CalendarRange }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  ALUMNI: "Alumni",
};

/** MYARCH Phase 3 (§4.2/§4.3) — Event Planner UI. Reachable by every role; visibility per event is entirely delegated to canViewEvent server-side (draft events are only visible to their organizer/Secretary/delegated Coordinators). */
export default function EventsLayout({ children }: { children: React.ReactNode }) {
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
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Events"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
