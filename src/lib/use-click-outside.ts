"use client";

import { useEffect } from "react";

/**
 * Standard popover dismissal: while `active`, a pointerdown outside every
 * ref in `containerRefs` closes it via `onOutside`. Refs (not just the panel
 * itself) so the trigger button can be excluded too — otherwise a
 * pointerdown on the trigger would close the panel here, and the trigger's
 * own click handler would immediately reopen it a moment later, making the
 * "click the bell again to close it" toggle silently do nothing.
 *
 * `pointerdown`, not `click`, so this fires before the trigger's own click
 * handler and never fights with clicks on real content inside the panel
 * (links, buttons) — those are only ever "inside" and never reach here.
 */
export function useClickOutside(
  active: boolean,
  containerRefs: readonly React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      const isInside = containerRefs.some((ref) => ref.current?.contains(target));
      if (!isInside) onOutside();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onOutside]);
}
