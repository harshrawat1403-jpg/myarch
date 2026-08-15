"use client";

import { Megaphone } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/announcements", label: "Announcements", icon: Megaphone }];

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  ALUMNI: "Alumni",
};

/** MYARCH Phase 3 (§4.5) — Announcements UI. Reachable by every role; visibility per announcement is entirely delegated to canViewAnnouncement server-side (active + audience-matched, or full access for whoever manages it). */
export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
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
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Announcements"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
