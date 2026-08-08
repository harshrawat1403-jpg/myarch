"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus cycling within `containerRef` while `active`,
 * moves focus into it on activation, and restores focus to whatever was
 * focused beforehand once it becomes inactive again — the standard
 * dismissible-overlay focus contract (WAI-ARIA dialog pattern).
 *
 * Shared, not duplicated: `PublicNav`'s mobile drawer uses this today, and
 * the `Modal` component (Milestone 9,
 * docs/design/V1_UI_SPECIFICATION.md Part B "Dialogs") is specified to
 * reuse the identical behavior — built once now so Modal doesn't
 * reimplement it later.
 */
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    getFocusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [active, containerRef]);
}
