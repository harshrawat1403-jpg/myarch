"use client";

import { LayoutDashboard, Users, Layers, ClipboardCheck, History, Download, Settings, UserCog, Building2, IdCard, CalendarClock } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { useRequireRole } from "@/lib/use-require-role";
import { SheetLayout, type NavItem } from "@/components/sheet-layout";
import { LoadingScreen } from "@/components/loading-screen";

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users, group: "Management" },
  { href: "/dashboard/batches", label: "Batches", icon: Layers, group: "Management" },
  { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck, group: "Workflow" },
  { href: "/dashboard/audit", label: "Audit", icon: History, group: "Workflow" },
  { href: "/dashboard/exports", label: "Exports", icon: Download, group: "Resources" },
  // Directory is visible to both roles (matches its own route handler's
  // { roles: ["SECRETARY", "COORDINATOR"] } gate) — placed in BASE_NAV_ITEMS,
  // not SECRETARY_ONLY_NAV_ITEMS, even though it shares the "Administration"
  // group label with Coordinators/Recruiters below.
  { href: "/dashboard/admin/directory", label: "Directory", icon: IdCard, group: "Administration" },
];

// Secretary-only — every /dashboard/admin/* route handler is gated
// { roles: ["SECRETARY"] } server-side, so a Coordinator never sees a nav
// entry that would just 403.
const SECRETARY_ONLY_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/admin/coordinators", label: "Coordinators", icon: UserCog, group: "Administration" },
  { href: "/dashboard/admin/recruiters", label: "Recruiters", icon: Building2, group: "Administration" },
  { href: "/dashboard/admin/academic-year", label: "Academic Year", icon: CalendarClock, group: "Administration" },
];

// Ungrouped, like Overview — also reachable from UserMenu (see
// accountSettingsHref below). Registered here so SheetLayout's
// longest-href-match breadcrumb/title resolution picks "Account
// Settings" instead of falling back to Overview (a bare "/dashboard"
// nav item is a prefix of every dashboard route — see
// findActiveNavItem's doc comment).
const ACCOUNT_NAV_ITEM: NavItem = { href: "/dashboard/account", label: "Account Settings", icon: Settings };

const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Secretary",
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
