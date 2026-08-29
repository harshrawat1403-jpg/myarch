"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle, SectionHeading, CardTitle, DataLabel } from "@/components/ui/typography";
import { useEditMode } from "./edit-mode-context";
import { usePageOverrides } from "./page-overrides-context";

/**
 * String keys only — never a component reference. The pages that use
 * `EditableText` are Server Components; a React component (a function) is
 * not serializable across the server→client prop boundary (confirmed the
 * hard way: `next build` — "Functions cannot be passed directly to Client
 * Components"). Mapping happens inside this Client Component instead,
 * which can safely import and reference `PageTitle`/etc. directly.
 */
const TAG_COMPONENTS = {
  h1: PageTitle,
  h2: SectionHeading,
  h3: CardTitle,
  label: DataLabel,
  p: "p",
  span: "span",
} as const;

export interface EditableTextProps {
  /** Stable identifier for this field within the page, e.g. "hero.title", "stats.0.label". */
  contentKey: string;
  /** The developer-authored copy — rendered whenever no override exists, and restored by "Reset to original." */
  defaultValue: string;
  /** Renders as this tag (or the matching typography component — see `TAG_COMPONENTS`) with `className` applied — identical markup to the plain interpolation this replaces. */
  as?: keyof typeof TAG_COMPONENTS;
  className?: string;
  /** Sizes the edit textarea for a longer paragraph vs. a short heading/label. */
  multiline?: boolean;
}

/**
 * MYARCH Edit Mode — draft/preview/publish pass. In normal mode (Edit Mode
 * off, or the viewer isn't a Secretary) this renders EXACTLY like the bare
 * `{value}` interpolation it replaces — the PUBLISHED value only, same
 * tag, same className, no wrapper markup; a pending draft never shows here.
 * With Edit Mode on but not previewing, it also shows the published value
 * (with edit affordances) — Preview is the one explicit place a pending
 * draft becomes visible, and only to a Secretary. Saving stages a draft
 * (immediately reflected locally, since it's this component's own edit);
 * Reset stages a removal the same way. A whole-session Discard reverts
 * this back to published, even for an edit this instance made itself.
 */
export function EditableText({ contentKey, defaultValue, as = "span", className, multiline = false }: EditableTextProps) {
  const Tag = TAG_COMPONENTS[as];
  const { role, accessToken } = useAuth();
  const { isActive, discardGeneration, refreshPendingCount } = useEditMode();
  const { page, overrides, draftOverrides, isPreviewing } = usePageOverrides();
  const toast = useToast();

  const published = overrides[contentKey] ?? null;
  const draft = draftOverrides[contentKey] ?? null;

  // Local override — set once THIS component instance saves or resets, so
  // the edit reflects immediately without waiting for a Preview re-fetch.
  // Cleared on a whole-session Discard; a Publish deliberately does NOT
  // clear it, because what it already shows is exactly what just went
  // live. Render-time reset (not an effect) on `discardGeneration`
  // changing — the same "adjust state when a prop changes" pattern used
  // elsewhere in this codebase (e.g. Modal's own wasOpen/visible reset).
  const [localOverride, setLocalOverride] = useState<{ value: string; hasOverride: boolean } | null>(null);
  const [lastDiscardGeneration, setLastDiscardGeneration] = useState(discardGeneration);
  if (discardGeneration !== lastDiscardGeneration) {
    setLastDiscardGeneration(discardGeneration);
    setLocalOverride(null);
  }

  const contextValue = isPreviewing ? (draft ? (draft.textValue ?? defaultValue) : (published?.textValue ?? defaultValue)) : (published?.textValue ?? defaultValue);
  const contextHasOverride = isPreviewing ? draft !== null : published !== null;

  const value = localOverride?.value ?? contextValue;
  const hasOverride = localOverride?.hasOverride ?? contextHasOverride;

  const [isEditing, setIsEditing] = useState(false);
  const [draftInput, setDraftInput] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  if (!isActive || role !== "SECRETARY") {
    // Normal/public rendering never depends on isPreviewing — only a
    // Secretary can ever set isPreviewing true in the first place.
    return <Tag className={className}>{contextValue}</Tag>;
  }

  function startEditing() {
    setDraftInput(value);
    setIsEditing(true);
  }

  async function handleSave() {
    const trimmed = draftInput.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/api/content-overrides/${page}/${contentKey}`, { type: "TEXT", textValue: trimmed }, accessToken ?? undefined);
      setLocalOverride({ value: trimmed, hasOverride: true });
      setIsEditing(false);
      toast.success("Saved as a draft — not yet published.");
      void refreshPendingCount();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save this change.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    try {
      await apiClient.delete(`/api/content-overrides/${page}/${contentKey}`, accessToken ?? undefined);
      setLocalOverride({ value: defaultValue, hasOverride: false });
      setIsEditing(false);
      toast.success("Reset staged — publish to apply it.");
      void refreshPendingCount();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reset this field.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <span className="not-prose relative isolate z-30 inline-block w-full max-w-xl rounded-md border border-(--color-accent) bg-(--color-surface) p-2 shadow-lg">
        <Textarea
          autoFocus
          rows={multiline ? 5 : 2}
          value={draftInput}
          onChange={(e) => setDraftInput(e.target.value)}
          className="text-sm"
        />
        <span className="mt-2 flex items-center justify-end gap-1.5">
          {hasOverride && (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isSaving}
              aria-label="Reset to original"
              title="Reset to original"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-secondary) hover:bg-(--color-surface-muted) disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            aria-label="Cancel"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-secondary) hover:bg-(--color-surface-muted) disabled:opacity-50"
          >
            <X aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !draftInput.trim()}
            aria-label="Save"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-(--color-accent) text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check aria-hidden="true" size={14} />
          </button>
        </span>
      </span>
    );
  }

  // Deliberately no `role="button"`/`aria-label` override here: `Tag` is
  // often a real heading (`PageTitle`, `SectionHeading`, `CardTitle`), and
  // an explicit `role` attribute replaces an element's native role in the
  // accessibility tree — stamping "button" over "heading" would silently
  // break heading-based page navigation for every editable heading
  // whenever Edit Mode is active. `tabIndex`/`onClick`/`onKeyDown` alone
  // still make it operable by mouse and keyboard without touching the
  // element's own semantics or accessible name.
  return (
    <Tag
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
      className={`${className ?? ""} cursor-text rounded-sm outline-dashed outline-1 outline-offset-2 outline-transparent transition-colors duration-150 hover:bg-(--color-accent-soft)/50 hover:outline-(--color-accent) focus-visible:outline-(--color-accent)`}
    >
      {value}
    </Tag>
  );
}
