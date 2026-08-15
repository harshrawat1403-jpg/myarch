"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CalendarRange,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Mail,
  Megaphone,
  UserCircle,
  Wrench,
} from "lucide-react";
import { useRequireRole } from "@/lib/use-require-role";
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
  // MYARCH Phase 2/3 product-completion pass — same routes the admin shell
  // now links to, each already self-scoped server-side to "this student's
  // own records" by its own use case (SearchTasksUseCase/
  // SearchMaintenanceIssuesUseCase/SearchRequestsUseCase force
  // ownerId/requesterId = self for a STUDENT actor; the Calendar/Events/
  // Announcements sources apply their own equivalent per-actor scoping).
  // No admin-only surface is linked here: no Maintenance Dashboard, no
  // Meetings (its route group's own guard technically admits STUDENT, but
  // it has no student-facing purpose — meetings are staff/council business;
  // a student added as a participant can still be reached via a direct
  // link, just not from this nav), no request/event/meeting administration.
  { href: "/tasks", label: "My Tasks", icon: ListTodo },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/requests", label: "My Requests", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
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
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "STUDENT",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange) {
    return <LoadingScreen />;
  }

  return (
    <SheetLayout
      navItems={NAV_ITEMS}
      roleLabel="Student"
      accountSettingsHref="/student/account"
      onLogout={handleLogout}
    >
      {children}
    </SheetLayout>
  );
}
