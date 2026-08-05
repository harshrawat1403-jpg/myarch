"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export interface SheetLayoutProps {
  navItems: readonly NavItem[];
  roleLabel: string;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * The "drawing sheet" page frame from docs/design/11_UI_Architecture.md: a
 * persistent, role-scoped left rail plus a content area, standing in for
 * every authenticated admin screen. Not a generic sidebar-dashboard
 * template — the identity comes from the shared design tokens (dark
 * background, accent-only-for-active-state) and the TitleBlock strip each
 * page composes within its own content.
 */
export function SheetLayout({ navItems, roleLabel, onLogout, children }: SheetLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[--color-background] text-[--color-text-primary]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[--color-text-secondary]/20 bg-[--color-surface] p-4">
        <div className="mb-6">
          <p className="font-[family-name:var(--font-data)] text-xs uppercase tracking-wide text-[--color-text-secondary]">
            TNPArch
          </p>
          <p className="text-sm">{roleLabel}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-[--color-accent]/15 text-[--color-accent]"
                    : "text-[--color-text-secondary] hover:text-[--color-text-primary]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={onLogout}
          className="mt-4 rounded-md px-3 py-2 text-left text-sm text-[--color-text-secondary] hover:text-[--color-text-primary]"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
