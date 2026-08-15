"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { DataLabel } from "@/components/ui/typography";
import { Logo } from "@/components/logo";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { PageContainer } from "./page-container";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/placements", label: "Placements" },
  { href: "/students", label: "Students" },
  { href: "/recruiters", label: "Recruiters" },
  // V4.0 B5: explicitly named in docs/planning/V4_0_PRD.md §3.
  { href: "/directory", label: "Student Directory" },
  // V4.0 B1: the public registration entry point (§7 step 2) — added here
  // for discoverability, the same reasoning the PRD gives for
  // "Student Directory" above.
  { href: "/register", label: "Register" },
  // MYARCH — the public entry point for Maintenance reporting (§3.1). Links
  // to a plain public utility page (/maintenance/report), never the
  // authenticated /maintenance workspace — see that page's own doc comment.
  { href: "/maintenance/report", label: "Maintenance" },
  { href: "/contact", label: "Contact" },
] as const;

function isActivePath(pathname: string | null, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

/**
 * The public marketing site's top navigation — the "front door" nav for
 * every unauthenticated page (docs/design/V1_UI_SPECIFICATION.md Part D.1's
 * exact spec). Desktop (≥md): full horizontal link row + a visually
 * distinct "Sign In" button. Below `md`: a hamburger toggle opens a
 * full-width drawer with the same items, focus-trapped while open
 * (shares `useFocusTrap` with the future `Modal` component per Part B).
 *
 * Active-link treatment (`--color-accent` text + `aria-current="page"`)
 * deliberately matches `SheetLayout`'s active rail-item treatment exactly —
 * the Design Consistency checklist (Part I) requires the two navs to read
 * as one family despite being structurally different (top strip vs. rail).
 */
export function PublicNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Closes the drawer on route change (link clicks, browser back/forward)
  // using React's recommended "adjust state when a prop changes" pattern —
  // a render-time comparison against the previous value, not an effect —
  // so this never costs an extra render pass the way `useEffect(() => {
  // setIsMenuOpen(false) }, [pathname])` would (and does trigger
  // react-hooks/set-state-in-effect, correctly: that version really is the
  // anti-pattern the rule exists to catch, not a false positive like the
  // fetch-on-mount effects elsewhere in this codebase).
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

  return (
    <header className="border-b border-(--color-text-secondary)/20 bg-(--color-surface)">
      <div className="hidden border-b border-(--color-text-secondary)/10 md:block">
        <PageContainer className="flex items-center justify-between py-1.5">
          <DataLabel className="text-[10px]">Department of Architecture &amp; Planning</DataLabel>
          <DataLabel className="text-[10px]">VNIT Nagpur</DataLabel>
        </PageContainer>
      </div>

      <PageContainer className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center">
          <Logo variant="full" size="md" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm tracking-wide transition-colors duration-150 ${
                  active
                    ? "text-(--color-accent)"
                    : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/login" className={buttonClassName("secondary", "px-5 py-2")}>
            Sign In
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-(--color-text-primary) focus:outline-none focus:ring-1 focus:ring-(--color-accent) md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="public-mobile-menu"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="font-[family-name:var(--font-data)] text-lg">
            {isMenuOpen ? "✕" : "☰"}
          </span>
        </button>
      </PageContainer>

      {isMenuOpen && (
        <div
          id="public-mobile-menu"
          ref={menuRef}
          className="border-t border-(--color-text-secondary)/20 md:hidden"
        >
          <nav aria-label="Primary" className="flex flex-col px-4 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm ${
                    active
                      ? "text-(--color-accent)"
                      : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className={buttonClassName("secondary", "mt-2 w-full border-t border-(--color-text-secondary)/20 pt-4")}
            >
              Sign In
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
