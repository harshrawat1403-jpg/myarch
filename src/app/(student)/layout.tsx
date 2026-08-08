"use client";

import { UserCircle } from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const NAV_ITEMS: NavItem[] = [{ href: "/student", label: "My Profile", icon: UserCircle }];

/**
 * Route protection for the entire (student) segment — Student role only,
 * the same guard pattern as (admin) and (recruiter): a UX convenience that
 * redirects before rendering a page that would just get 403s back from
 * every fetch. The real authorization is enforced server-side on every API
 * call underneath (docs/security/14_Security_Architecture.md), never by
 * this layout alone.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole(["STUDENT"]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout navItems={NAV_ITEMS} roleLabel="Student" onLogout={handleLogout}>
      {children}
    </SheetLayout>
  );
}
