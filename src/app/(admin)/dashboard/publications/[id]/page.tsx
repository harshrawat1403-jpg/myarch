"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Download,
  History,
  Save,
  Send,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
// Values from the client-safe entry point — importing them from the main
// barrel here would drag Playwright/pptxgenjs (the export pipeline) into
// this page's client bundle. See modules/publications/client.ts's own doc
// comment.
import { ACCENT_COLORS, FONT_PAIRINGS, type PublicationBlock, type PublicationBlockType } from "@/modules/publications/client";
import type {
  PublicationRecord,
  PublicationExportFormat,
  PublicationExportRecord,
  PublicationVersionRecord,
} from "@/modules/publications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { BlockEditForm } from "@/components/publications/block-edit-form";
import { PublicationPreviewOverlay } from "@/components/publications/publication-preview-overlay";
import type { PublicationResolvedData } from "@/components/publications/publication-renderer";

const BLOCK_TYPE_LABELS: Record<PublicationBlockType, string> = {
  COVER: "Cover",
  HEADING: "Heading",
  TEXT: "Text",
  IMAGE: "Image",
  STUDENT_PROFILE: "Student Profile",
  COMPANY_LOGO_GRID: "Company Logos",
  ALUMNI_PROFILE: "Alumni Profile",
  STAT_SUMMARY: "Statistics",
  DIVIDER: "Divider",
  BACK_COVER: "Back Cover",
};

const ADDABLE_BLOCK_TYPES: PublicationBlockType[] = ["HEADING", "TEXT", "IMAGE", "DIVIDER"];

const EXPORT_FORMATS: { format: PublicationExportFormat; label: string; tier: string }[] = [
  { format: "PDF", label: "PDF", tier: "Importable into Canva/Photoshop as an image" },
  { format: "PPTX", label: "PowerPoint (PPTX)", tier: "Editable in PowerPoint, Keynote, Google Slides" },
  { format: "PNG", label: "PNG (one image per page, zipped)", tier: "Importable into Canva/Photoshop as an image" },
  { format: "JPEG", label: "JPEG (one image per page, zipped)", tier: "Importable into Canva/Photoshop as an image" },
];

function emptyBlockData(type: PublicationBlockType): PublicationBlock["data"] {
  switch (type) {
    case "HEADING":
      return { text: "New heading", level: 2 };
    case "TEXT":
      return { text: "" };
    case "IMAGE":
      return { fileId: null, caption: null };
    case "DIVIDER":
      return {};
    default:
      return {};
  }
}

/**
 * V4.0 E4-E5 (§13.1) — the Publication Studio editor: block-level
 * reorder/show-hide/edit/image-swap, style choices, Preview, Save Draft,
 * Publish (with version history), and Export. Full access for Secretary and
 * both Coordinator positions — no role-gated controls anywhere on this page
 * (§9, §13's own "identical to the Secretary").
 */
export default function PublicationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const toast = useToast();

  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<PublicationBlock[]>([]);
  const [accentColor, setAccentColor] = useState<string>(ACCENT_COLORS[0].hex);
  const [fontPairing, setFontPairing] = useState<string>(FONT_PAIRINGS[0].key);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PublicationResolvedData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<PublicationVersionRecord[]>([]);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);

  const [showExports, setShowExports] = useState(false);
  const [exportsList, setExportsList] = useState<PublicationExportRecord[]>([]);
  const [pendingExportFormat, setPendingExportFormat] = useState<PublicationExportFormat | null>(null);

  const [confirmPublish, setConfirmPublish] = useState(false);

  async function load() {
    if (!accessToken || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<PublicationRecord>(`/api/publications/${id}`, accessToken);
      setPublication(result);
      setTitle(result.title);
      setBlocks([...result.content.blocks]);
      setAccentColor(result.content.style.accentColor);
      setFontPairing(result.content.style.fontPairing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this publication.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  function currentContent() {
    return { blocks, style: { accentColor, fontPairing } };
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setBlocks((current) => {
      const index = current.findIndex((b) => b.id === blockId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= current.length) return current;
      const next = [...current];
      [next[index], next[swapWith]] = [next[swapWith]!, next[index]!];
      return next;
    });
  }

  function toggleVisible(blockId: string) {
    setBlocks((current) => current.map((b) => (b.id === blockId ? { ...b, visible: !b.visible } : b)));
  }

  function deleteBlock(blockId: string) {
    setBlocks((current) => current.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  function updateBlockData(blockId: string, data: PublicationBlock["data"]) {
    setBlocks((current) => current.map((b) => (b.id === blockId ? ({ ...b, data } as PublicationBlock) : b)));
  }

  function addBlock(type: PublicationBlockType) {
    const newBlock = { id: crypto.randomUUID(), type, visible: true, data: emptyBlockData(type) } as PublicationBlock;
    setBlocks((current) => [...current, newBlock]);
    setSelectedBlockId(newBlock.id);
  }

  async function handleSave() {
    if (!accessToken || !publication) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.patch<PublicationRecord>(
        `/api/publications/${publication.id}`,
        { title, content: currentContent(), pageSize: publication.pageSize, expectedVersion: publication.version },
        accessToken,
      );
      setPublication(updated);
      toast.success("Draft saved.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Someone else edited this publication — reload the page and redo your changes.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Unable to save this draft.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!accessToken || !publication) return;
    setIsPublishing(true);
    try {
      // Publish always acts on the currently-saved content — save first so
      // the version snapshot it creates matches what's on screen.
      await handleSave();
      const published = await apiClient.post<PublicationRecord>(`/api/publications/${publication.id}/publish`, undefined, accessToken);
      setPublication(published);
      toast.success("Published.");
      setConfirmPublish(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to publish this publication.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handlePreview() {
    if (!accessToken) return;
    setIsLoadingPreview(true);
    setShowPreview(true);
    try {
      const resolved = await apiClient.post<PublicationResolvedData>("/api/publications/preview-data", currentContent(), accessToken);
      setPreviewData(resolved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to load preview data.");
      setShowPreview(false);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function loadVersions() {
    if (!accessToken || !publication) return;
    try {
      const result = await apiClient.get<PublicationVersionRecord[]>(`/api/publications/${publication.id}/versions`, accessToken);
      setVersions(result);
      setShowVersions(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to load version history.");
    }
  }

  async function handleRestoreVersion(versionNumber: number) {
    if (!accessToken || !publication) return;
    try {
      const restored = await apiClient.post<PublicationRecord>(`/api/publications/${publication.id}/versions/${versionNumber}/restore`, undefined, accessToken);
      setPublication(restored);
      setTitle(restored.title);
      setBlocks([...restored.content.blocks]);
      setAccentColor(restored.content.style.accentColor);
      setFontPairing(restored.content.style.fontPairing);
      toast.success(`Restored version ${versionNumber} into the draft.`);
      setConfirmRestoreVersion(null);
      setShowVersions(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to restore this version.");
    }
  }

  async function loadExports() {
    if (!accessToken || !publication) return;
    try {
      const result = await apiClient.get<PublicationExportRecord[]>(`/api/publications/${publication.id}/exports`, accessToken);
      setExportsList(result);
      setShowExports(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to load exports.");
    }
  }

  async function handleRequestExport(format: PublicationExportFormat) {
    if (!accessToken || !publication) return;
    setPendingExportFormat(format);
    try {
      await apiClient.post(`/api/publications/${publication.id}/export`, { format }, accessToken);
      toast.success(`${format} export requested — it will appear below once ready.`);
      await loadExports();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to request this export.");
    } finally {
      setPendingExportFormat(null);
    }
  }

  async function handleDownloadExport(exportRecord: PublicationExportRecord) {
    if (!accessToken || !publication) return;
    try {
      const { blob, filename } = await apiClient.download(
        `/api/publications/${publication.id}/exports/${exportRecord.id}/download`,
        accessToken,
        `${title || "publication"}.${exportRecord.format.toLowerCase()}`,
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to download this export.");
    }
  }

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  if (error || !publication) return <p className="text-sm text-(--color-danger)">{error ?? "Publication not found."}</p>;

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <DataLabel>Publication Studio</DataLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 max-w-md text-lg font-semibold" />
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={publication.status === "PUBLISHED" ? "approved" : "neutral"}>{publication.status}</Badge>
            <span className="text-xs text-(--color-text-secondary)">v{publication.version}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => void loadVersions()}>
            <History aria-hidden="true" size={15} />
            Versions
          </Button>
          <Button type="button" variant="ghost" onClick={() => void loadExports()}>
            <Download aria-hidden="true" size={15} />
            Export
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handlePreview()}>
            <Eye aria-hidden="true" size={15} />
            Preview
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <Save aria-hidden="true" size={15} />}
            Save Draft
          </Button>
          <Button type="button" variant="primary" onClick={() => setConfirmPublish(true)}>
            <Send aria-hidden="true" size={15} />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-(--color-text-primary)">Blocks</p>
            <AddBlockMenu onAdd={addBlock} />
          </div>

          <div className="space-y-2">
            {blocks.map((block, index) => (
              <div key={block.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    selectedBlockId === block.id ? "border-(--color-accent) bg-(--color-accent-soft)" : "border-(--color-border) hover:bg-(--color-surface-muted)"
                  } ${!block.visible ? "opacity-50" : ""}`}
                >
                  <span className="min-w-0 flex-1 truncate text-(--color-text-primary)">{BLOCK_TYPE_LABELS[block.type]}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={block.visible ? "Hide block" : "Show block"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisible(block.id);
                    }}
                    className="shrink-0 rounded p-1 text-(--color-text-secondary) hover:bg-(--color-surface)"
                  >
                    {block.visible ? <Eye aria-hidden="true" size={14} /> : <EyeOff aria-hidden="true" size={14} />}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, "up");
                    }}
                    className={`shrink-0 rounded p-1 text-(--color-text-secondary) hover:bg-(--color-surface) ${index === 0 ? "pointer-events-none opacity-30" : ""}`}
                  >
                    <ArrowUp aria-hidden="true" size={14} />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, "down");
                    }}
                    className={`shrink-0 rounded p-1 text-(--color-text-secondary) hover:bg-(--color-surface) ${index === blocks.length - 1 ? "pointer-events-none opacity-30" : ""}`}
                  >
                    <ArrowDown aria-hidden="true" size={14} />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Delete block"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(block.id);
                    }}
                    className="shrink-0 rounded p-1 text-(--color-danger) hover:bg-(--color-danger-soft)"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </span>
                </button>

                {selectedBlock?.id === block.id && (
                  <div className="mt-2 rounded-md border border-(--color-border) bg-(--color-background) p-4">
                    <BlockEditForm block={block} accessToken={accessToken} onChange={(data) => updateBlockData(block.id, data)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-(--color-text-primary)">Style</p>
          <div>
            <DataLabel>Accent Color</DataLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.key}
                  type="button"
                  aria-label={color.label}
                  onClick={() => setAccentColor(color.hex)}
                  className={`h-8 w-8 rounded-full border-2 ${accentColor === color.hex ? "border-(--color-text-primary)" : "border-transparent"}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="font-pairing">Font Pairing</Label>
            <select
              id="font-pairing"
              value={fontPairing}
              onChange={(e) => setFontPairing(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm"
            >
              {FONT_PAIRINGS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      {showPreview && (
        <PublicationPreviewOverlay
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          content={currentContent()}
          pageSize={publication.pageSize}
          resolvedData={previewData ?? { students: {}, companies: {}, alumni: {}, stats: null }}
        />
      )}
      {isLoadingPreview && showPreview && !previewData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-(--color-surface)/60">
          <Loader2 aria-hidden="true" size={24} className="animate-spin text-(--color-accent)" />
        </div>
      )}

      {showVersions && (
        <Modal isOpen={showVersions} onClose={() => setShowVersions(false)} title="Version History">
          {versions.length === 0 ? (
            <p className="text-sm text-(--color-text-secondary)">No versions yet — Publish to create the first one.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-(--color-text-primary)">Version {v.versionNumber}</span>
                    <span className="ml-2 text-xs text-(--color-text-secondary)">{new Date(v.createdAt).toISOString().slice(0, 10)}</span>
                  </span>
                  <Button type="button" variant="ghost" onClick={() => setConfirmRestoreVersion(v.versionNumber)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {confirmRestoreVersion !== null && (
        <ConfirmDialog
          isOpen={confirmRestoreVersion !== null}
          onClose={() => setConfirmRestoreVersion(null)}
          onConfirm={() => handleRestoreVersion(confirmRestoreVersion)}
          title={`Restore version ${confirmRestoreVersion}?`}
          description="This replaces the current draft's content with this version. You can still Publish again afterward to make it live."
          confirmLabel="Restore"
        />
      )}

      {showExports && (
        <Modal isOpen={showExports} onClose={() => setShowExports(false)} title="Export">
          <div className="space-y-4">
            <div className="space-y-2">
              {EXPORT_FORMATS.map(({ format, label, tier }) => (
                <div key={format} className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-(--color-text-primary)">{label}</p>
                    <p className="text-xs text-(--color-text-secondary)">{tier}</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void handleRequestExport(format)} disabled={pendingExportFormat === format}>
                    {pendingExportFormat === format ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : "Generate"}
                  </Button>
                </div>
              ))}
            </div>

            {exportsList.length > 0 && (
              <div className="border-t border-(--color-border) pt-3">
                <DataLabel>Past Exports</DataLabel>
                <ul className="mt-2 space-y-1">
                  {exportsList.map((exp) => (
                    <li key={exp.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant={exp.status === "READY" ? "approved" : exp.status === "FAILED" ? "rejected" : "pending"}>{exp.status}</Badge>
                        {exp.format}
                      </span>
                      {exp.status === "READY" && (
                        <Button type="button" variant="ghost" onClick={() => void handleDownloadExport(exp)}>
                          Download
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}

      {confirmPublish && (
        <ConfirmDialog
          isOpen={confirmPublish}
          onClose={() => setConfirmPublish(false)}
          onConfirm={handlePublish}
          title="Publish this publication?"
          description="This saves your current changes and creates a new version snapshot. Publishing makes it the live version."
          confirmLabel="Publish"
          isConfirming={isPublishing}
        />
      )}
    </div>
  );
}

function AddBlockMenu({ onAdd }: { onAdd: (type: PublicationBlockType) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <Button type="button" variant="ghost" onClick={() => setIsOpen((open) => !open)}>
        <Plus aria-hidden="true" size={15} />
        Add Block
      </Button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-(--color-border) bg-(--color-surface) p-1 shadow-lg">
          {ADDABLE_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setIsOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
            >
              {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
