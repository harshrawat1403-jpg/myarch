"use client";

import { BarChart3, Briefcase, LayoutDashboard, Mail, UserCircle } from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
import { useDemoSession } from "@/lib/use-demo-session";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

// V4.0 D6 — "/student" reworks into the Career Hub dashboard; the previous
// profile-editor content it used to render moves to its own "/student/profile"
// route (§2 IA), so it gets its own nav entry alongside the dashboard.
// V4.0 E7 (PRD §4 — Student Reports: "Own data only"): Reports joins as a
// first-class destination too, own-applications only.
const NAV_ITEMS: NavItem[] = [
  { href: "/student", label: "Overview", icon: LayoutDashboard },
  { href: "/student/applications", label: "Applications", icon: Briefcase },
  { href: "/student/interests", label: "Interests", icon: Mail },
  { href: "/student/reports", label: "My Reports", icon: BarChart3 },
  { href: "/student/profile", label: "My Profile", icon: UserCircle },
];

/**
 * Route protection for the entire (student) segment — Student role only,
 * the same guard pattern as (admin) and (recruiter): a UX convenience that
 * redirects before rendering a page that would just get 403s back from
 * every fetch. The real authorization is enforced server-side on every API
 * call underneath (docs/security/14_Security_Architecture.md), never by
 * this layout alone.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  // Public MYARCH showcase — "Switch Demo"/"Exit Demo" in SheetLayout's demo
  // banner, distinct from the normal UserMenu logout (still wired to
  // handleLogout below, unchanged). Read before useRequireRole so its
  // `pending` can suppress that guard's redirect while a switch/exit is
  // applying new session state out from under the still-mounted layout —
  // see useRequireRole's own doc comment for the race this prevents.
  const { isDemo, pending: demoPending, switchDemo, exitDemo } = useDemoSession();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole(
    ["STUDENT"],
    { suppressRedirect: demoPending !== null },
  );

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout
      navItems={NAV_ITEMS}
      roleLabel="Student"
      accountSettingsHref="/student/account"
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
