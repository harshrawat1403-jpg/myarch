"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ImageUp, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { useEditMode } from "./edit-mode-context";
import { usePageOverrides } from "./page-overrides-context";

export interface EditableImageProps {
  /** Stable identifier for this field within the page, e.g. "hero.image". */
  contentKey: string;
  /** Rendered whenever no override image exists — today, always the existing `ImagePlaceholder` the page already used here. Unchanged in normal mode. */
  fallback: ReactNode;
  /** Applied to the wrapping element — pass through the same sizing classes the fallback's own container used (e.g. `"h-full w-full"`). */
  className?: string;
}

/**
 * MYARCH Edit Mode — draft/preview/publish pass. Mirrors `EditableText`'s
 * normal-mode/draft/preview split exactly. In normal (non-previewing) mode
 * renders either the PUBLISHED image or `fallback` — a pending draft image
 * never shows here. Replacing an image never deletes the previous
 * `FileAsset`; "Reset to original" only stages the removal.
 */
export function EditableImage({ contentKey, fallback, className }: EditableImageProps) {
  const { role, accessToken } = useAuth();
  const { isActive, discardGeneration, refreshPendingCount } = useEditMode();
  const { page, overrides, draftOverrides, isPreviewing } = usePageOverrides();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const published = overrides[contentKey] ?? null;
  const draft = draftOverrides[contentKey] ?? null;

  // Render-time reset (not an effect) on `discardGeneration` changing —
  // see EditableText's own doc comment for why.
  const [localOverride, setLocalOverride] = useState<{ fileId: string | null; hasOverride: boolean } | null>(null);
  const [lastDiscardGeneration, setLastDiscardGeneration] = useState(discardGeneration);
  if (discardGeneration !== lastDiscardGeneration) {
    setLastDiscardGeneration(discardGeneration);
    setLocalOverride(null);
  }

  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const contextFileId = isPreviewing ? (draft ? draft.fileId : (published?.fileId ?? null)) : (published?.fileId ?? null);
  const contextHasOverride = isPreviewing ? draft !== null : published !== null;

  const fileId = localOverride ? localOverride.fileId : contextFileId;
  const hasOverride = localOverride?.hasOverride ?? contextHasOverride;

  // Every image already used anywhere on this page (published or, once
  // fetched, draft) — a lightweight per-page reuse picker, not a global
  // media library (approved plan §8/§9). Purely derived from data already
  // in memory; no new endpoint.
  const pageImageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const record of Object.values(overrides)) {
      if (record.type === "IMAGE" && record.fileId) ids.add(record.fileId);
    }
    for (const record of Object.values(draftOverrides)) {
      if (record.type === "IMAGE" && record.fileId) ids.add(record.fileId);
    }
    ids.delete(fileId ?? "");
    return [...ids];
  }, [overrides, draftOverrides, fileId]);

  const image = fileId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${fileId}`} alt="" className={`h-full w-full object-cover ${className ?? ""}`} />
  ) : (
    fallback
  );

  if (!isActive || role !== "SECRETARY") {
    return image;
  }

  async function saveImageOverride(newFileId: string) {
    if (!accessToken) return;
    await apiClient.put(`/api/content-overrides/${page}/${contentKey}`, { type: "IMAGE", fileId: newFileId }, accessToken);
    setLocalOverride({ fileId: newFileId, hasOverride: true });
    setShowPicker(false);
    toast.success("Saved as a draft — not yet published.");
    void refreshPendingCount();
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiClient.upload<{ fileId: string }>("/api/content-overrides/media", formData, accessToken);
      await saveImageOverride(uploaded.fileId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to replace this image.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handlePickExisting(pickedFileId: string) {
    try {
      await saveImageOverride(pickedFileId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to use this image.");
    }
  }

  async function handleReset() {
    if (!accessToken) return;
    setIsUploading(true);
    try {
      await apiClient.delete(`/api/content-overrides/${page}/${contentKey}`, accessToken);
      setLocalOverride({ fileId: null, hasOverride: false });
      toast.success("Reset staged — publish to apply it.");
      void refreshPendingCount();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reset this image.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="group relative">
      {image}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-(--color-text-primary) shadow-lg hover:bg-white/90 disabled:opacity-50"
          >
            {isUploading ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <ImageUp aria-hidden="true" size={15} />}
            Replace Image
          </button>
          {pageImageIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-(--color-text-primary) shadow-lg hover:bg-white/90 disabled:opacity-50"
            >
              Choose Existing
            </button>
          )}
          {fileId && (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isUploading}
              aria-label="Reset to original image"
              title="Reset to original image"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-(--color-text-primary) shadow-lg hover:bg-white/90 disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" size={15} />
            </button>
          )}
        </div>
        {showPicker && (
          <div className="flex max-w-[90%] flex-wrap justify-center gap-1.5 rounded-md bg-white/95 p-1.5 shadow-lg">
            {pageImageIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => void handlePickExisting(id)}
                aria-label="Use this image"
                className="h-10 w-10 shrink-0 overflow-hidden rounded border-2 border-transparent hover:border-(--color-accent)"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${id}`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleUpload(e)} />
    </div>
  );
}
