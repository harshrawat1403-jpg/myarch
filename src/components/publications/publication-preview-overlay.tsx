"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { PublicationRenderer, type PublicationResolvedData } from "./publication-renderer";
import type { PublicationContent, PublicationPageSize } from "@/modules/publications";

export interface PublicationPreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content: PublicationContent;
  pageSize: PublicationPageSize;
  resolvedData: PublicationResolvedData;
}

/**
 * V4.0 E4 (§13.1 step 4 — "Preview renders the current draft state exactly
 * as it will export"). Deliberately not built on the shared `Modal`
 * (max-w-md) — a page-accurate preview needs real page-width space, so this
 * is its own full-screen overlay, reusing `useFocusTrap`/Escape-to-close
 * the same way every other overlay in this app does.
 */
export function PublicationPreviewOverlay({ isOpen, onClose, content, pageSize, resolvedData }: PublicationPreviewOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, panelRef);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-(--color-surface-muted)" role="dialog" aria-modal="true" aria-label="Publication preview">
      <div ref={panelRef} className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-5 py-3">
        <p className="font-[family-name:var(--font-display)] text-base font-semibold text-(--color-text-primary)">Preview</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        >
          <X aria-hidden="true" size={18} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {/* Screen-only page separation (shadow/spacing) — never present in
            the actual export's HTML document, so this can't visually drift
            from what page.pdf()/screenshot() actually produce. */}
        <style>{`[data-block-id] { margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }`}</style>
        <div className="mx-auto flex w-fit flex-col items-center gap-8">
          <PublicationRenderer
            content={content}
            pageSize={pageSize}
            resolvedData={resolvedData}
            resolveImageSrc={(fileId) => `/api/files/${fileId}`}
          />
        </div>
      </div>
    </div>
  );
}
