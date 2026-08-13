"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, GraduationCap, LogOut, ShieldCheck, Users2 } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useClickOutside } from "@/lib/use-click-outside";
import type { DemoPersona } from "@/lib/demo-persona";

export interface DemoSwitchMenuProps {
  /** The persona currently being switched into, `"EXIT"` while exiting, or `null` when idle. */
  pending: DemoPersona | "EXIT" | null;
  onSwitchDemo: (persona: DemoPersona) => void;
  onExitDemo: () => void;
}

const SWITCH_OPTIONS: { persona: DemoPersona; label: string; icon: typeof GraduationCap }[] = [
  { persona: "STUDENT", label: "Visit as Student", icon: GraduationCap },
  { persona: "RECRUITER", label: "Visit as Recruiter", icon: Users2 },
  { persona: "ADMIN", label: "Visit as Demo Admin", icon: ShieldCheck },
];

/**
 * The demo banner's "Switch Demo ▾" control (SheetLayout) — lets a visitor
 * already inside a demo session jump straight to another persona, or exit,
 * without first leaving the dashboard for the public landing page. Mirrors
 * UserMenu/NotificationBell's exact dropdown contract (useFocusTrap,
 * click-outside + Escape to close) rather than inventing a second pattern.
 * All the actual work — calling the existing `/api/auth/demo-login` via
 * `loginAsDemo()`, then navigating — lives in `useDemoSession`; this
 * component only renders the trigger and the menu.
 */
export function DemoSwitchMenu({ pending, onSwitchDemo, onExitDemo }: DemoSwitchMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(isOpen, panelRef);
  useClickOutside(isOpen, [panelRef, buttonRef], () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const isBusy = pending !== null;

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        aria-expanded={isOpen}
        aria-controls="demo-switch-panel"
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isBusy}
        className="flex items-center gap-1.5 rounded-full border border-white/60 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors duration-150 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-xs"
      >
        {isBusy ? "Switching…" : "Switch Demo"}
        <ChevronDown
          aria-hidden="true"
          size={13}
          strokeWidth={2.5}
          className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          id="demo-switch-panel"
          ref={panelRef}
          role="menu"
          aria-label="Switch demo account"
          className="absolute left-1/2 z-30 mt-2 w-52 -translate-x-1/2 rounded-md border border-(--color-border) bg-(--color-surface) p-1 text-left normal-case tracking-normal text-(--color-text-primary) shadow-lg sm:left-0 sm:translate-x-0"
        >
          {SWITCH_OPTIONS.map(({ persona, label, icon: Icon }) => (
            <button
              key={persona}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onSwitchDemo(persona);
              }}
              disabled={isBusy}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
              {label}
            </button>
          ))}
          <div className="my-1 border-t border-(--color-border)" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onExitDemo();
            }}
            disabled={isBusy}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.75} />
            Exit Demo
          </button>
        </div>
      )}
    </div>
  );
}
