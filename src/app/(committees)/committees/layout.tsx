"use client";

import { Landmark } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";
import { ROLE_LABELS } from "@/lib/role-labels";

const NAV_ITEMS: NavItem[] = [{ href: "/committees", label: "Committees", icon: Landmark }];

/** MYARCH Phase 4 (§5) — Council & Committees UI. Unlike Meetings, a Committee is broadly visible (canViewCommittee — everyone but Recruiter), so Alumni is included here alongside Secretary/Coordinator/Student. */
export default function CommitteesLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
    "STUDENT",
    "ALUMNI",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel={ROLE_LABELS[role ?? ""] ?? "Committees"} onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
