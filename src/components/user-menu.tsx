"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, LogOut, Settings } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";

export interface UserMenuProps {
  roleLabel: string;
  /** Coordinator-only batch scope sub-label (e.g. "Scoped to 2 batches") — omitted for unscoped roles. */
  scopeLabel?: string;
  /** V3.0: shows an "Account Settings" link when provided — only the (admin) shell passes this today (Account Settings serves Secretary/Coordinator only, see update-own-profile.ts). */
  accountSettingsHref?: string;
  onLogout: () => void;
}

/**
 * The authenticated shell's account menu — role (plus an optional
 * Coordinator scope sub-label) as the trigger, a focus-trapped panel with
 * its available actions (Visit Website, optionally Account Settings, Log
 * out) when open. Reuses `useFocusTrap` and the exact toggle/Escape-to-close
 * interaction `PublicNav`'s mobile drawer already established. Version 2.0:
 * restyled with an avatar-initial circle (matching the sidebar's own
 * profile block) and a Lucide chevron instead of the V1.1 ▲/▼ glyphs.
 *
 * V4.0 UX fix: "Visit Website" is the one place, common to all four
 * authenticated roles, where a signed-in user can get back to the public
 * marketing site — the sidebar brand-mark link intentionally still goes to
 * the role's own portal home (an equally standard, already-tested
 * convention), so this is additive, not a repurposing of it.
 *
 * Points at `/about`, not `/` — `/`'s own page component (see its doc
 * comment) deliberately bounces any authenticated session straight back to
 * its portal home, which is exactly right for someone who lands on the bare
 * domain by accident but exactly wrong for a deliberate "let me see the
 * public site" click: it would just flash and redirect right back. `/about`
 * is a real, already-existing public page with no such guard, and from
 * there the full public nav (including "Home") is available — no new page,
 * no change to `/`'s own behavior.
 */
export function UserMenu({ roleLabel, scopeLabel, accountSettingsHref, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(isOpen, menuRef);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="user-menu-panel"
        aria-label={`Account menu, signed in as ${roleLabel}`}
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-md border border-(--color-border) py-1.5 pl-1.5 pr-2.5 text-left text-sm text-(--color-text-primary) transition-colors duration-150 hover:border-(--color-accent) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-semibold text-(--color-accent)">
          {roleLabel.charAt(0).toUpperCase()}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span>{roleLabel}</span>
          {scopeLabel ? <span className="text-[10px] text-(--color-text-secondary)">{scopeLabel}</span> : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          strokeWidth={2}
          className={`text-(--color-text-secondary) transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          id="user-menu-panel"
          ref={menuRef}
          className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-(--color-border) bg-(--color-surface) p-1 shadow-lg"
        >
          {accountSettingsHref && (
            <Link
              href={accountSettingsHref}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
            >
              <Settings aria-hidden="true" size={16} strokeWidth={1.75} />
              Account Settings
            </Link>
          )}
          <Link
            href="/about"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
          >
            <Globe aria-hidden="true" size={16} strokeWidth={1.75} />
            Visit Website
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
