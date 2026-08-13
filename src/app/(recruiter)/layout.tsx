"use client";

import { BarChart3, Bookmark, LayoutDashboard, Mail, Users } from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
import { useDemoSession } from "@/lib/use-demo-session";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

// V4.0 C4 (Q2): /recruiter is now the dashboard; the directory moved to
// /recruiter/directory, with Saved and Interests joining it as first-class
// destinations consolidating C1–C3 data.
// V4.0 E7 (PRD §4 — Recruiter Reports: "Own data only"): Reports joins as a
// first-class destination too, own-activity only — never institutional data.
const NAV_ITEMS: NavItem[] = [
  { href: "/recruiter", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recruiter/directory", label: "Student Directory", icon: Users },
  { href: "/recruiter/saved", label: "Saved", icon: Bookmark },
  { href: "/recruiter/interests", label: "Interests", icon: Mail },
  { href: "/recruiter/reports", label: "My Reports", icon: BarChart3 },
];

/**
 * Route protection for the entire (recruiter) segment — Recruiter role
 * only. This layout, and every page under it, is intentionally isolated
 * from the (admin) segment: it shares only presentational primitives
 * (SheetLayout, Button, Table, …) and the generic useAuth() session hook,
 * never an admin data-fetching path or component.
 */
export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  // Public MYARCH showcase — "Switch Demo"/"Exit Demo" in SheetLayout's demo
  // banner, distinct from the normal UserMenu logout (still wired to
  // handleLogout below, unchanged). Read before useRequireRole so its
  // `pending` can suppress that guard's redirect while a switch/exit is
  // applying new session state out from under the still-mounted layout —
  // see useRequireRole's own doc comment for the race this prevents.
  const { isDemo, pending: demoPending, switchDemo, exitDemo } = useDemoSession();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole(
    ["RECRUITER"],
    { suppressRedirect: demoPending !== null },
  );

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout
      navItems={NAV_ITEMS}
      roleLabel="Recruiter"
      onLogout={handleLogout}
      isDemo={isDemo}
      demoPending={demoPending}
      onSwitchDemo={switchDemo}
      onExitDemo={exitDemo}
    >
      {children}
    </SheetLayout>
  );
}
