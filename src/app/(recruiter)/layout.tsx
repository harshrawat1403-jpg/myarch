"use client";

import { Users } from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/recruiter", label: "Student Directory", icon: Users }];

/**
 * Route protection for the entire (recruiter) segment — Recruiter role
 * only. This layout, and every page under it, is intentionally isolated
 * from the (admin) segment: it shares only presentational primitives
 * (SheetLayout, Button, Table, …) and the generic useAuth() session hook,
 * never an admin data-fetching path or component.
 */
export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole(["RECRUITER"]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel="Recruiter" onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
