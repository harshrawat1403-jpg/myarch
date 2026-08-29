"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient } from "@/lib/api-client";
import type { DraftSummary } from "@/modules/content-overrides";

interface EditModeContextValue {
  isActive: boolean;
  toggle: () => void;
  /** Total pending drafts across every page in the current session — the toolbar's "N changes". Refreshed on activate and after any save/reset/publish/discard. */
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
  /**
   * Global "Preview" intent, set by the toolbar (not per-page — the
   * toolbar sits above every page in the tree, so a page-local toggle
   * can't be reached from it). Each page's `PageOverridesProvider` watches
   * this and independently fetches/clears ITS OWN page's draft — this
   * context never holds draft content itself.
   */
  isPreviewing: boolean;
  togglePreview: () => void;
  /**
   * Bumped once per Discard. `EditableText`/`EditableImage` watch this to
   * clear their own locally-saved value and revert to the published
   * content — a Discard must restore exactly the last published state,
   * even for a field this component instance itself just edited.
   * `PageOverridesProvider` also watches it to drop its cached preview
   * draft. Also exits Preview (see `bumpDiscardGeneration`) — after a
   * Discard there is nothing pending left to preview.
   */
  discardGeneration: number;
  /**
   * Bumped once per Publish. Only `PageOverridesProvider` watches this
   * (drops its cached preview draft, since draft and published are now
   * identical) — `EditableText`/`EditableImage` do NOT clear their local
   * value on publish, because what they're already showing is exactly
   * what just went live. Also exits Preview (see `bumpPublishGeneration`):
   * `overrides` (the published map) is fetched once per page load and
   * never re-fetched client-side, so remaining in Preview after a Publish
   * would clear the draft overlay and fall through to that stale snapshot
   * for any field not locally edited in the current page load — the exact
   * same snapshot a non-previewing view already shows, so exiting Preview
   * avoids a spurious "reverts to old content" moment without claiming to
   * fix staleness itself (only a real reload does that, same as always).
   */
  publishGeneration: number;
  /** Called by the toolbar only, after a successful Publish/Discard call. */
  bumpDiscardGeneration: () => void;
  bumpPublishGeneration: () => void;
}

const EditModeContext = createContext<EditModeContextValue | undefined>(undefined);

/**
 * MYARCH Edit Mode — draft/preview/publish pass. Holds whether editing is
 * toggled on, the site-wide pending-draft count, the global Preview
 * intent, and the two "something session-wide just happened" signals
 * every page's fields react to. Mounted once in `(marketing)/layout.tsx`,
 * so all of this persists across client-side navigation between marketing
 * pages. Purely a UI convenience — the real authorization boundary is
 * server-side on every `/api/content-overrides/**` route; a non-Secretary
 * who somehow forces `isActive: true` client-side would just get a 403 on
 * any action.
 */
export function EditModeProvider({ children }: { children: ReactNode }) {
  const { role, accessToken } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [discardGeneration, setDiscardGeneration] = useState(0);
  const [publishGeneration, setPublishGeneration] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (role !== "SECRETARY" || !accessToken) return;
    try {
      const summary = await apiClient.get<DraftSummary>("/api/content-overrides/drafts/summary", accessToken);
      setPendingCount(summary.total);
    } catch {
      // Best-effort — a stale count is a minor UI inconvenience, never worth surfacing an error for.
    }
  }, [role, accessToken]);

  function toggle() {
    setIsActive((current) => {
      const next = !current;
      if (next) void refreshPendingCount();
      else setIsPreviewing(false);
      return next;
    });
  }

  return (
    <EditModeContext.Provider
      value={{
        isActive,
        toggle,
        pendingCount,
        refreshPendingCount,
        isPreviewing,
        togglePreview: () => setIsPreviewing((v) => !v),
        discardGeneration,
        publishGeneration,
        bumpDiscardGeneration: () => {
          setDiscardGeneration((g) => g + 1);
          setIsPreviewing(false);
        },
        bumpPublishGeneration: () => {
          setPublishGeneration((g) => g + 1);
          setIsPreviewing(false);
        },
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

const INACTIVE_DEFAULT: EditModeContextValue = {
  isActive: false,
  toggle: () => {},
  pendingCount: 0,
  refreshPendingCount: async () => {},
  isPreviewing: false,
  togglePreview: () => {},
  discardGeneration: 0,
  publishGeneration: 0,
  bumpDiscardGeneration: () => {},
  bumpPublishGeneration: () => {},
};

/**
 * Falls back to an always-inactive default outside `EditModeProvider`
 * rather than throwing — `EditableText`/`EditableImage` render on every
 * target page, and a page rendered standalone (e.g. in a unit test, or any
 * future context outside the marketing layout) should still render its
 * plain default content, not crash for lack of an edit-mode toggle it
 * doesn't need.
 */
export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext) ?? INACTIVE_DEFAULT;
}
