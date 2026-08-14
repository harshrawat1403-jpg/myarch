"use client";

import { Home } from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/alumni", label: "Home", icon: Home }];

/**
 * Route protection for the entire (alumni) segment — Alumni role only.
 * MYARCH Phase 1 (§2.4/§0.12) — an honest "Coming Soon" holding page, not a
 * fake feature set; mirrors (recruiter)/layout.tsx's shape exactly.
 */
export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole(["ALUMNI"]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel="Alumni" onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
