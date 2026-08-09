"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Menu, Search, X, type LucideIcon } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";
import { Logo } from "@/components/logo";
import { CommandPalette } from "@/components/command-palette";

export interface NavItem {
  href: string;
  label: string;
  /** Version 2.0: every real nav item gets a Lucide icon — optional only so a future item added without one degrades to a text-only row instead of a type error. */
  icon?: LucideIcon;
  /** Version 2.0: groups items under a small section label in the sidebar (e.g. "Management", "Workflow"). Omitted items (or a nav with only one item, like the Recruiter/Student portals) render flat, ungrouped. */
  group?: string;
}

export interface SheetLayoutProps {
  navItems: readonly NavItem[];
  roleLabel: string;
  /** Coordinator-only batch scope sub-label — omitted for unscoped roles (Secretary, Recruiter, Student). */
  scopeLabel?: string;
  /** V3.0: passed through to UserMenu's optional "Account Settings" link — see UserMenuProps's doc comment. */
  accountSettingsHref?: string;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Where the TNPArch sidebar/drawer branding sends an authenticated user who
 * wants to see the public website — not `/`, whose own page component
 * deliberately bounces any authenticated session straight back to its
 * portal home (exactly right for someone who lands on the bare domain by
 * accident, exactly wrong for a deliberate "let me see the public site"
 * click, which would just flash and redirect right back). `/about` is a
 * real, already-existing public page with no such guard; the full public
 * nav (including "Home") is reachable from there — no new page, no change
 * to `/`'s own behavior.
 */
const PUBLIC_WEBSITE_HREF = "/about";

function isHrefMatch(pathname: string | null, href: string): boolean {
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

/**
 * Resolves exactly one active item, not every item whose href happens to
 * be a path prefix. The admin nav's "Overview" (`/dashboard`) is itself a
 * prefix of every other admin route, so a naive per-item prefix check
 * marks two items active at once on a nested page — fixed by taking the
 * most specific (longest) href among every match.
 */
function findActiveNavItem(pathname: string | null, navItems: readonly NavItem[]): NavItem | undefined {
  const matches = navItems.filter((item) => isHrefMatch(pathname, item.href));
  if (matches.length === 0) return undefined;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best));
}

function roleInitial(roleLabel: string): string {
  return roleLabel.charAt(0).toUpperCase();
}

/**
 * The authenticated application shell. Version 2.0: rebuilt from the
 * ground up for the premium-SaaS brief — a floating, rounded, collapsible
 * sidebar with grouped navigation and Lucide icons (replacing V1.1's flush
 * bordered rail); a sticky header with breadcrumb, page context, a search
 * field, a notification indicator, and the account menu.
 *
 * Shell-only, exactly as in every prior redesign: navigation targets,
 * role-guarding, and every page rendered inside `children` are unchanged.
 * Only the frame around them changed.
 *
 * **A heading-hierarchy decision, flagged rather than made silently**: the
 * brief asks the header to show a page title. Every page already renders
 * its own `<h1>` inside `children` (with page-specific subtitle context a
 * generic nav-label title would lose) — adding a second `<h1>` here would
 * mean two per page, which breaks "exactly one `h1`" (asserted by several
 * existing page tests) and is a real accessibility anti-pattern regardless
 * of whether a test catches it. Resolved by rendering the header's title
 * as a visual-only, `aria-hidden` echo of the active nav item's label —
 * sighted users get the premium "title in the header" look the mockup
 * shows; screen-reader users get the page's real `<h1>` exactly once,
 * plus the breadcrumb's own `aria-current="page"` marking the same page.
 * Not a second semantic heading, a redundant visual one.
 */
export function SheetLayout({ navItems, roleLabel, scopeLabel, accountSettingsHref, onLogout, children }: SheetLayoutProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Closes the mobile drawer on route change — render-time "adjust state
  // when a prop changes" pattern, not an effect (see PublicNav for the
  // same justification).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMenuOpen(false);
  }

  useFocusTrap(isMenuOpen, menuRef);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const activeItem = findActiveNavItem(pathname, navItems);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "TNPArch", href: navItems[0]?.href },
    ...(activeItem ? [{ label: activeItem.label }] : []),
  ];

  function renderNavLinks(collapsed: boolean) {
    const nodes: ReactNode[] = [];
    let lastGroup: string | undefined;

    for (const item of navItems) {
      if (item.group && item.group !== lastGroup) {
        nodes.push(
          <p
            key={`group-${item.group}`}
            className={`mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)/70 first:mt-0 ${collapsed ? "hidden" : ""}`}
          >
            {item.group}
          </p>,
        );
      }
      lastGroup = item.group;

      const isActive = item.href === activeItem?.href;
      const Icon = item.icon;
      nodes.push(
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          aria-label={item.label}
          title={collapsed ? item.label : undefined}
          className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
            isActive
              ? "bg-(--color-accent-soft) font-medium text-(--color-accent)"
              : "text-(--color-text-secondary) hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
          }`}
        >
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-(--color-accent)"
            />
          )}
          {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={1.75} className="shrink-0" /> : null}
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>,
      );
    }

    return nodes;
  }

  return (
    <div className="flex min-h-screen bg-(--color-background)">
      {/* Desktop: floating, collapsible sidebar. */}
      <aside className={`hidden shrink-0 p-3 transition-[width] duration-200 md:block ${isCollapsed ? "md:w-[88px]" : "md:w-64"}`}>
        <div className="sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-lg border border-(--color-border) bg-(--color-surface) p-4 shadow-sm">
          <Link
            href={PUBLIC_WEBSITE_HREF}
            aria-label="TNPArch — Visit public website"
            className="mb-6 flex items-center gap-2.5 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          >
            <Logo variant={isCollapsed ? "mark" : "full"} size="sm" />
          </Link>

          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {renderNavLinks(isCollapsed)}
          </nav>

          <button
            type="button"
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mt-3 flex items-center justify-center gap-2 rounded-md border border-(--color-border) py-2 text-xs text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          >
            {isCollapsed ? <ChevronRight size={16} strokeWidth={1.75} /> : <ChevronLeft size={16} strokeWidth={1.75} />}
            {!isCollapsed && "Collapse"}
          </button>

          <div className="mt-3 flex items-center gap-2.5 border-t border-(--color-border) pt-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-secondary-soft) text-xs font-semibold text-(--color-secondary)">
              {roleInitial(roleLabel)}
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-(--color-text-primary)">{roleLabel}</span>
                {scopeLabel ? (
                  <span className="block truncate text-[11px] text-(--color-text-secondary)">{scopeLabel}</span>
                ) : null}
              </span>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-(--color-border) bg-(--color-surface)/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) md:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="authenticated-mobile-menu"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              {isMenuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
            </button>
            <div className="min-w-0">
              <div className="hidden sm:block">
                <Breadcrumbs items={breadcrumbItems} />
              </div>
              {/* Visual-only echo of the active section — see this component's
                  doc comment for why this is `aria-hidden`, not a second `<h1>`. */}
              <p aria-hidden="true" className="mt-0.5 truncate font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">
                {activeItem?.label ?? roleLabel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              aria-label="Open command palette"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) lg:h-auto lg:w-auto lg:gap-2 lg:rounded-md lg:border lg:border-(--color-border) lg:bg-(--color-background) lg:py-2 lg:pl-3 lg:pr-2 lg:hover:border-(--color-accent) lg:hover:bg-transparent"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.75} />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="ml-4 hidden rounded border border-(--color-border) px-1.5 py-0.5 font-[family-name:var(--font-data)] text-[11px] text-(--color-text-secondary) lg:inline">
                Ctrl K
              </kbd>
            </button>

            <NotificationBell />

            <UserMenu
              roleLabel={roleLabel}
              scopeLabel={scopeLabel}
              accountSettingsHref={accountSettingsHref}
              onLogout={onLogout}
            />
          </div>
        </header>

        {isMenuOpen && (
          <div
            id="authenticated-mobile-menu"
            ref={menuRef}
            className="border-b border-(--color-border) bg-(--color-surface) md:hidden"
          >
            {/* The desktop sidebar's branding-as-public-website-link, mirrored
                here since the desktop <aside> above is `hidden md:block` and
                never renders below md — this drawer is mobile's equivalent of
                the sidebar, so it gets the same branding block at its head. */}
            <Link
              href={PUBLIC_WEBSITE_HREF}
              aria-label="TNPArch — Visit public website"
              onClick={() => setIsMenuOpen(false)}
              className="mx-4 mt-4 flex items-center gap-2.5 rounded-md px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
            >
              <Logo variant="full" size="sm" />
            </Link>
            <nav aria-label="Primary" className="flex flex-col gap-1 px-4 py-4">
              {renderNavLinks(false)}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        navItems={navItems}
        onLogout={onLogout}
      />
    </div>
  );
}
