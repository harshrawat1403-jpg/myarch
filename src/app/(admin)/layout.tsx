"use client";

import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardCheck,
  ClipboardList,
  History,
  Download,
  Settings,
  UserCog,
  Building2,
  IdCard,
  CalendarClock,
  Briefcase,
  GraduationCap,
  Target,
  Contact,
  BookOpen,
  ListTodo,
  Wrench,
  Gauge,
  Inbox,
  CalendarDays,
  CalendarRange,
  Megaphone,
  Landmark,
  FileText,
  ClipboardPenLine,
} from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users, group: "Management" },
  { href: "/dashboard/batches", label: "Batches", icon: Layers, group: "Management" },
  { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck, group: "Workflow" },
  // V4.0 B2: visible to both roles — Coordinator can comment/mark, Secretary
  // additionally decides (B3). Matches its own route handlers' shared
  // { roles: ["SECRETARY", "COORDINATOR"] } gate.
  {
    href: "/dashboard/registrations",
    label: "Registrations",
    icon: ClipboardList,
    group: "Workflow",
  },
  { href: "/dashboard/forms", label: "Forms", icon: FileText, group: "Workflow" },
  { href: "/dashboard/form-applications", label: "Form Applications", icon: ClipboardPenLine, group: "Workflow" },
  { href: "/dashboard/audit", label: "Audit", icon: History, group: "Workflow" },
  // V4.0 E7 (§2, §3, §16): rename/extend "Exports" → "Reports" — the route
  // itself moves from /dashboard/exports to /dashboard/reports (a
  // rename-and-extend of the same page, not a new parallel system).
  { href: "/dashboard/reports", label: "Reports", icon: Download, group: "Resources" },
  // V4.0 §3: "**Placement**: + Companies, Placement Drives, Internships" —
  // Company moved here from "Administration" to match the approved nav
  // grouping now that Placement Drives/Internships exist alongside it.
  // Company is Secretary-managed, Coordinator-viewable; write actions
  // inside each page are gated on role, not the nav entry itself. Placed
  // BEFORE the Administration group below, not after: SheetLayout's
  // renderNavLinks only inserts one group header per *contiguous* run of
  // matching `group` values, and SECRETARY_ONLY_NAV_ITEMS appends three
  // more "Administration" items straight after BASE_NAV_ITEMS — inserting
  // "Placement" between Directory and that run would split "Administration"
  // into two non-adjacent chunks and duplicate its header (React duplicate-
  // key warning, caught by admin-layout.test.tsx).
  { href: "/dashboard/companies", label: "Companies", icon: Briefcase, group: "Placement" },
  // V4.0 D2 — Internships is the SAME PlacementDrive model filtered to
  // type=INTERNSHIP (§0's "type variant, not a parallel entity"), never a
  // separate feature; both routes share PlacementDriveListPage.
  {
    href: "/dashboard/placement-drives",
    label: "Placement Drives",
    icon: Target,
    group: "Placement",
  },
  { href: "/dashboard/internships", label: "Internships", icon: GraduationCap, group: "Placement" },
  // V4.0 D5 (§3): "**People**: + Alumni." Full CRUD for both roles — no
  // role-gated write UI on this page at all, unlike Companies.
  { href: "/dashboard/alumni", label: "Alumni", icon: Contact, group: "People" },
  // V4.0 E3-E5 (§13) — full access for both Coordinator positions, identical
  // to the Secretary (never role-gated beyond the shared route-handler
  // { roles: ["SECRETARY", "COORDINATOR"] } gate) — its own contiguous group,
  // same contiguity rule as "Placement" above: placed before Directory so it
  // never splits an existing group's concatenation-adjacent chunks.
  { href: "/dashboard/publications", label: "Publications", icon: BookOpen, group: "Publications" },
  // MYARCH Phase 2/3 product-completion pass — these seven route groups
  // ((tasks)/(maintenance)/(requests)/(calendar)/(events)/(meetings)/
  // (announcements)) have existed, fully built and server-authorized,
  // since their respective phases shipped; only the nav entry pointing at
  // them was missing. Visible to both Secretary and Coordinator here,
  // matching the same "nav shows it, the page's own use cases gate what a
  // Coordinator can actually do inside it" split every other BASE_NAV_ITEMS
  // entry above already uses (e.g. Companies) — a Coordinator without
  // maintenance.manage/requests.manage/etc. still sees these pages, but
  // canManage*/hasCoordinatorPermission inside each one still applies
  // exactly as before. Placed here, before Directory, for the same
  // group-contiguity reason as Placement/Publications above (Directory's
  // own "Administration" group must stay adjacent to
  // SECRETARY_ONLY_NAV_ITEMS's own "Administration" run once concatenated).
  { href: "/tasks", label: "Tasks", icon: ListTodo, group: "Operations" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, group: "Operations" },
  { href: "/maintenance/dashboard", label: "Maintenance Dashboard", icon: Gauge, group: "Operations" },
  { href: "/requests", label: "Requests", icon: Inbox, group: "Operations" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "Activities" },
  { href: "/events", label: "Events", icon: CalendarRange, group: "Activities" },
  { href: "/meetings", label: "Meetings", icon: Users, group: "Activities" },
  { href: "/announcements", label: "Announcements", icon: Megaphone, group: "Activities" },
  // MYARCH Phase 4 (§5) — same "existed, fully built and server-authorized;
  // only the nav entry was missing" precedent as the six entries above,
  // added at ship time this phase rather than deferred to a later cleanup.
  { href: "/committees", label: "Committees", icon: Landmark, group: "Activities" },
  // Directory is visible to both roles (matches its own route handler's
  // { roles: ["SECRETARY", "COORDINATOR"] } gate) — placed in BASE_NAV_ITEMS,
  // not SECRETARY_ONLY_NAV_ITEMS, even though it shares the "Administration"
  // group label with Coordinators/Recruiters below. Must stay the LAST
  // BASE_NAV_ITEMS entry so its "Administration" group is adjacent to
  // SECRETARY_ONLY_NAV_ITEMS's own "Administration" items once concatenated.
  { href: "/dashboard/admin/directory", label: "Directory", icon: IdCard, group: "Administration" },
];

// Secretary-only — every /dashboard/admin/* route handler is gated
// { roles: ["SECRETARY"] } server-side, so a Coordinator never sees a nav
// entry that would just 403.
const SECRETARY_ONLY_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/elections", label: "Elections", icon: Landmark, group: "Administration" },
  {
    href: "/dashboard/admin/coordinators",
    label: "Coordinators",
    icon: UserCog,
    group: "Administration",
  },
  {
    href: "/dashboard/admin/recruiters",
    label: "Recruiters",
    icon: Building2,
    group: "Administration",
  },
  {
    href: "/dashboard/admin/academic-year",
    label: "Academic Year",
    icon: CalendarClock,
    group: "Administration",
  },
];

// Ungrouped, like Overview — also reachable from UserMenu (see
// accountSettingsHref below). Registered here so SheetLayout's
// longest-href-match breadcrumb/title resolution picks "Account
// Settings" instead of falling back to Overview (a bare "/dashboard"
// nav item is a prefix of every dashboard route — see
// findActiveNavItem's doc comment).
const ACCOUNT_NAV_ITEM: NavItem = {
  href: "/dashboard/account",
  label: "Account Settings",
  icon: Settings,
};

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
};

function formatScopeLabel(batchScope: readonly string[] | null): string | undefined {
  if (!batchScope) return undefined;
  return `Scoped to ${batchScope.length} ${batchScope.length === 1 ? "batch" : "batches"}`;
}

/**
 * Route protection for the whole (admin) segment — everything under it is
 * Secretary/Coordinator only, matching every dashboard route handler's own
 * `withAuth({ roles: ["SECRETARY", "COORDINATOR"] })` gate. This is a UX
 * convenience (redirect before rendering a page that would just get 403s
 * back from every fetch); the real authorization is still enforced
 * server-side on every API call underneath, exactly as
 * docs/security/14_Security_Architecture.md requires — this layout never
 * substitutes for that.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, batchScope } = useAuth();
  const { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout } = useRequireRole([
    "SECRETARY",
    "COORDINATOR",
  ]);

  if (isLoading || !isAuthorized || isBlockedByPasswordChange || !role) {
    return <LoadingScreen />;
  }

  // Only a Coordinator's session carries a batch scope (Secretaries are
  // unscoped by design) — the shell discloses this per the journey review's
  // finding (V1_UI_SPECIFICATION.md Part G.4) rather than leaving a scoped
  // list with no indication it's a subset.
  const scopeLabel = role === "COORDINATOR" ? formatScopeLabel(batchScope) : undefined;
  const navItems =
    role === "SECRETARY"
      ? [...BASE_NAV_ITEMS, ...SECRETARY_ONLY_NAV_ITEMS, ACCOUNT_NAV_ITEM]
      : [...BASE_NAV_ITEMS, ACCOUNT_NAV_ITEM];

  return (
    <SheetLayout
      navItems={navItems}
      roleLabel={ROLE_LABELS[role] ?? role}
      scopeLabel={scopeLabel}
      accountSettingsHref="/dashboard/account"
      onLogout={handleLogout}
    >
      {children}
    </SheetLayout>
  );
}
