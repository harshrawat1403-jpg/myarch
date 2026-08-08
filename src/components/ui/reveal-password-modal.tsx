"use client";

import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { useToast } from "./toast";

export interface RevealPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Modal title shown before a password has been generated (e.g. "New Coordinator", "Reset password?"). */
  pendingTitle: string;
  /** Modal title shown once a password has been generated (e.g. "Coordinator created", "Password reset"). */
  revealedTitle: string;
  /** Reveal-once plaintext password — once set, the modal switches from `children` to the code box + Copy/Done view. */
  tempPassword: string | null;
  /** The exact sentence explaining what to do with the password — kept caller-owned so each flow's existing wording (create vs. reset) is preserved verbatim. */
  description: ReactNode;
  /** The "before" content — a create form or a reset confirmation prompt — rendered only while `tempPassword` is null. */
  children: ReactNode;
}

/**
 * Shared "reveal-once temporary password" modal — the code box, Copy
 * button, and Done button were identical, independently-typed JSX across
 * five call sites (coordinator/recruiter create modals, coordinator/
 * recruiter/student reset-password modals). Extracted here once that
 * crossed three real instances, well past the "second use is the signal"
 * threshold. Each caller keeps its own `children` (the pre-password form
 * or confirm prompt) and `description` text exactly as before — only the
 * post-generation structure and the copy-to-clipboard logic are shared.
 */
export function RevealPasswordModal({
  isOpen,
  onClose,
  pendingTitle,
  revealedTitle,
  tempPassword,
  description,
  children,
}: RevealPasswordModalProps) {
  const toast = useToast();

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword).catch(() => {});
    toast.success("Temporary password copied.");
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tempPassword ? revealedTitle : pendingTitle}>
      {tempPassword ? (
        <div className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">{description}</p>
          <div className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) bg-(--color-surface-muted) px-4 py-3">
            <code className="font-[family-name:var(--font-data)] text-sm text-(--color-text-primary)">{tempPassword}</code>
            <Button type="button" variant="secondary" onClick={copyPassword} className="shrink-0 gap-2">
              <Copy aria-hidden="true" size={14} strokeWidth={1.75} />
              Copy
            </Button>
          </div>
          <div className="flex justify-end border-t border-(--color-border) pt-4">
            <Button type="button" variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </Modal>
  );
}
