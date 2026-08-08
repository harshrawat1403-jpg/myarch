"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The generic focus-trapped confirmation/edit overlay specced (but never
 * built) in docs/design/V1_UI_SPECIFICATION.md Part B: frosted
 * `--color-surface` overlay, closes on Escape/backdrop click, fade + slight
 * scale on enter/exit (150–200ms, ease-out). Built on `useFocusTrap`, which
 * was deliberately made generic years ago anticipating exactly this
 * component — `CommandPalette` was the only prior consumer.
 */
export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Render-time reset (not an effect) when closing — the same "adjust state
  // when a prop changes" pattern used elsewhere in this codebase (e.g.
  // SheetLayout's mobile-drawer-close-on-route-change).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setVisible(false);
  }

  useFocusTrap(isOpen, panelRef);

  // Becoming visible genuinely needs an effect: it waits a frame so the
  // initial (hidden) state actually paints before flipping, letting the CSS
  // transition animate instead of snapping straight to the open state.
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // No SSR-safety `mounted` gate needed: every consumer starts closed
  // (`useState(false)`) and is only opened by a later user interaction, so
  // `isOpen` is never true during the server render pass that would lack
  // `document`.
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-surface)/80 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-md overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface) shadow-lg transition-[opacity,transform] duration-200 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
          <h2
            id="modal-title"
            className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && <div className="flex justify-end gap-3 border-t border-(--color-border) px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
