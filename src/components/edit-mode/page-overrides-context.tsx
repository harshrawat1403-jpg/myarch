"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient } from "@/lib/api-client";
import type { PageContentOverrides, PageDraftOverrides } from "@/modules/content-overrides";
import { useEditMode } from "./edit-mode-context";

interface PageOverridesContextValue {
  page: string;
  /** Published values, server-fetched once at page load — never re-fetched client-side. */
  overrides: PageContentOverrides;
  /** Pending drafts for this page — empty unless the toolbar's global Preview is on; SECRETARY-only data. */
  draftOverrides: PageDraftOverrides;
  isPreviewing: boolean;
  isLoadingPreview: boolean;
}

const PageOverridesContext = createContext<PageOverridesContextValue | undefined>(undefined);

/**
 * Wraps ONE page's content, seeded with that page's server-fetched
 * published-override map (`GetPageContentOverridesUseCase`, resolved by the
 * page's own Server Component — unchanged by this pass). Reacts to the
 * toolbar's global Preview toggle (`useEditMode().isPreviewing` — the
 * toolbar itself sits above every page, so it can't reach a page-local
 * preview state directly) by fetching THIS page's pending drafts, SECRETARY-
 * only, client-side, layered over the same already-rendered page — no
 * second route, no second renderer (approved plan §5).
 */
export function PageOverridesProvider({ page, overrides, children }: { page: string; overrides: PageContentOverrides; children: ReactNode }) {
  const { accessToken } = useAuth();
  const { isPreviewing, discardGeneration, publishGeneration } = useEditMode();
  const [draftOverrides, setDraftOverrides] = useState<PageDraftOverrides>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Render-time reset (not an effect) whenever Preview turns off, or a
  // Discard/Publish makes this page's cached draft stale (gone, or now
  // identical to published) — the same "adjust state when a prop changes"
  // pattern used elsewhere in this codebase (e.g. Modal's own
  // wasOpen/visible reset). The actual re-fetch, when Preview is ON, is a
  // genuine effect (a real subscription to an external system) below.
  const previewKey = `${isPreviewing}:${page}:${discardGeneration}:${publishGeneration}`;
  const [lastPreviewKey, setLastPreviewKey] = useState(previewKey);
  if (previewKey !== lastPreviewKey) {
    setLastPreviewKey(previewKey);
    setDraftOverrides({});
  }

  useEffect(() => {
    if (!isPreviewing || !accessToken) return;
    let cancelled = false;

    async function fetchDraft() {
      setIsLoadingPreview(true);
      try {
        const draft = await apiClient.get<PageDraftOverrides>(`/api/content-overrides/${page}/draft`, accessToken ?? undefined);
        if (!cancelled) setDraftOverrides(draft);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    }
    void fetchDraft();

    return () => {
      cancelled = true;
    };
  }, [isPreviewing, accessToken, page, discardGeneration, publishGeneration]);

  return (
    <PageOverridesContext.Provider value={{ page, overrides, draftOverrides, isPreviewing, isLoadingPreview }}>
      {children}
    </PageOverridesContext.Provider>
  );
}

export function usePageOverrides(): PageOverridesContextValue {
  const ctx = useContext(PageOverridesContext);
  if (!ctx) throw new Error("usePageOverrides must be used within PageOverridesProvider");
  return ctx;
}
