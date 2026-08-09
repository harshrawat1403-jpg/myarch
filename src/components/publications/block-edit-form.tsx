"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { PublicationBlock } from "@/modules/publications";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface BlockEditFormProps {
  block: PublicationBlock;
  accessToken: string | null;
  onChange: (data: PublicationBlock["data"]) => void;
}

/**
 * V4.0 E4 (§13.1 step 3 — "edit static text/heading blocks, swap images").
 * Data-bound blocks (STUDENT_PROFILE/COMPANY_LOGO_GRID/ALUMNI_PROFILE/
 * STAT_SUMMARY) render no form at all here — their content comes live from
 * the platform, not from a text field a Secretary/Coordinator could type
 * over (that would be exactly the "copy-pasted, can drift" problem §13.1
 * step 2 rules out).
 */
export function BlockEditForm({ block, accessToken, onChange }: BlockEditFormProps) {
  switch (block.type) {
    case "COVER":
      return (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`title-${block.id}`}>Title</Label>
            <Input id={`title-${block.id}`} value={block.data.title} onChange={(e) => onChange({ ...block.data, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`subtitle-${block.id}`}>Subtitle</Label>
            <Input
              id={`subtitle-${block.id}`}
              value={block.data.subtitle ?? ""}
              onChange={(e) => onChange({ ...block.data, subtitle: e.target.value || null })}
            />
          </div>
          <ImagePicker accessToken={accessToken} fileId={block.data.imageFileId} onChange={(fileId) => onChange({ ...block.data, imageFileId: fileId })} />
        </div>
      );

    case "HEADING":
      return (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`text-${block.id}`}>Heading text</Label>
            <Input id={`text-${block.id}`} value={block.data.text} onChange={(e) => onChange({ ...block.data, text: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Size</Label>
            <select
              value={block.data.level}
              onChange={(e) => onChange({ ...block.data, level: Number(e.target.value) as 1 | 2 })}
              className="rounded-md border border-(--color-border) bg-(--color-background) px-2 py-1.5 text-sm"
            >
              <option value={1}>Large</option>
              <option value={2}>Small</option>
            </select>
          </div>
        </div>
      );

    case "TEXT":
      return (
        <div>
          <Label htmlFor={`text-${block.id}`}>Text</Label>
          <Textarea id={`text-${block.id}`} rows={5} value={block.data.text} onChange={(e) => onChange({ ...block.data, text: e.target.value })} />
        </div>
      );

    case "IMAGE":
      return (
        <div className="space-y-3">
          <ImagePicker accessToken={accessToken} fileId={block.data.fileId} onChange={(fileId) => onChange({ ...block.data, fileId })} />
          <div>
            <Label htmlFor={`caption-${block.id}`}>Caption</Label>
            <Input
              id={`caption-${block.id}`}
              value={block.data.caption ?? ""}
              onChange={(e) => onChange({ ...block.data, caption: e.target.value || null })}
            />
          </div>
        </div>
      );

    case "BACK_COVER":
      return (
        <div>
          <Label htmlFor={`text-${block.id}`}>Closing text</Label>
          <Textarea
            id={`text-${block.id}`}
            rows={3}
            value={block.data.text ?? ""}
            onChange={(e) => onChange({ ...block.data, text: e.target.value || null })}
          />
        </div>
      );

    case "STUDENT_PROFILE":
    case "COMPANY_LOGO_GRID":
    case "ALUMNI_PROFILE":
    case "STAT_SUMMARY":
      return (
        <p className="text-sm text-(--color-text-secondary)">
          This block&apos;s content is sourced live from real platform data and can&apos;t be edited by hand. Update the
          underlying profile/record instead — this block always reflects it automatically.
        </p>
      );

    case "DIVIDER":
      return <p className="text-sm text-(--color-text-secondary)">A plain visual divider — nothing to edit.</p>;
  }
}

function ImagePicker({ accessToken, fileId, onChange }: { accessToken: string | null; fileId: string | null; onChange: (fileId: string | null) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiClient.upload<{ fileId: string }>("/api/publications/images", formData, accessToken);
      onChange(result.fileId);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload this image.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>Image</Label>
      <div className="flex items-center gap-3">
        {fileId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${fileId}`} alt="" className="h-16 w-16 rounded-md object-cover" />
        )}
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : <ImageIcon aria-hidden="true" size={14} />}
          {fileId ? "Replace" : "Upload"}
        </Button>
        {fileId && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleFileChange(e)} />
    </div>
  );
}
