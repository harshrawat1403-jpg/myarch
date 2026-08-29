"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, X } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEditMode } from "./edit-mode-context";

/**
 * The one entry point into Edit Mode — a small floating control, visible
 * only to a Secretary. Reached the same way a Secretary already reaches
 * the public site today (`SheetLayout`'s "visit public website" link →
 * `/about`); there is no separate Edit Mode dashboard route.
 *
 * MYARCH Edit Mode — draft/preview/publish pass: while active, this
 * expands into a small toolbar — "Edit Mode · N changes" plus Preview /
 * Save Changes (publish) / Discard Changes — replacing the earlier
 * bare toggle. Still only existing `Button`/`Badge`/`ConfirmDialog`
 * tokens — no new visual language, so the site still reads as "the
 * existing MYARCH website with editing controls temporarily enabled."
 */
export function EditModeToolbar() {
  const { role, accessToken } = useAuth();
  const { isActive, toggle, pendingCount, isPreviewing, togglePreview, refreshPendingCount, bumpPublishGeneration, bumpDiscardGeneration } = useEditMode();
  const toast = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (role !== "SECRETARY") return null;

  if (!isActive) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm font-medium text-(--color-text-primary) shadow-lg transition-colors duration-150 hover:border-(--color-accent)"
        >
          <Pencil aria-hidden="true" size={16} strokeWidth={1.75} />
          Edit Mode
        </button>
      </div>
    );
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const result = await apiClient.post<{ published: number }>("/api/content-overrides/publish", undefined, accessToken ?? undefined);
      toast.success(result.published > 0 ? `Published ${result.published} change${result.published === 1 ? "" : "s"}.` : "Nothing to publish.");
      bumpPublishGeneration();
      await refreshPendingCount();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to publish these changes.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    try {
      const result = await apiClient.post<{ discarded: number }>("/api/content-overrides/discard", undefined, accessToken ?? undefined);
      toast.success(result.discarded > 0 ? `Discarded ${result.discarded} change${result.discarded === 1 ? "" : "s"}.` : "Nothing to discard.");
      bumpDiscardGeneration();
      await refreshPendingCount();
      setConfirmDiscard(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to discard these changes.");
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5 rounded-lg border border-(--color-border) bg-(--color-surface) p-3 shadow-lg">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-(--color-text-primary)">
            Edit Mode
            {pendingCount > 0 && <Badge variant="active">{pendingCount} change{pendingCount === 1 ? "" : "s"}</Badge>}
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label="Exit Edit Mode"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-(--color-text-secondary) hover:bg-(--color-surface-muted)"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={isPreviewing ? "primary" : "secondary"} onClick={togglePreview} className="gap-1.5 px-3 py-1.5 text-xs">
            {isPreviewing ? <EyeOff aria-hidden="true" size={14} /> : <Eye aria-hidden="true" size={14} />}
            {isPreviewing ? "Exit Preview" : "Preview"}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handlePublish()}
            disabled={pendingCount === 0 || isPublishing}
            className="px-3 py-1.5 text-xs"
          >
            {isPublishing ? "Publishing…" : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDiscard(true)}
            disabled={pendingCount === 0}
            className="px-3 py-1.5 text-xs"
          >
            Discard Changes
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={handleDiscard}
        title="Discard all pending changes?"
        description="This abandons every unpublished edit across every page and restores the last published content. This can't be undone."
        confirmLabel="Discard"
        variant="destructive"
        isConfirming={isDiscarding}
      />
    </>
  );
}
