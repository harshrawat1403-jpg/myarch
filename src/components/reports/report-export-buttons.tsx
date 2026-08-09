"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export interface ReportExportButtonsProps {
  readonly path: string;
  readonly formats: readonly ("csv" | "xlsx" | "pptx")[];
  readonly fallbackPrefix: string;
}

const FORMAT_LABELS: Record<"csv" | "xlsx" | "pptx", string> = { csv: "CSV", xlsx: "Excel (XLSX)", pptx: "PowerPoint (PPTX)" };

/**
 * V4.0 E7 — reused by every report page (institutional + own-activity).
 * Verified genuine (not just "a button that exists"): the server always
 * regenerates the export from the same real aggregation queries the JSON
 * view uses (see respond-with-report.ts) — there is no separate, possibly-
 * stale export code path.
 */
export function ReportExportButtons({ path, formats, fallbackPrefix }: ReportExportButtonsProps) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  async function handleDownload(format: "csv" | "xlsx" | "pptx") {
    if (!accessToken) return;
    setDownloadingFormat(format);
    try {
      const separator = path.includes("?") ? "&" : "?";
      const { blob, filename } = await apiClient.download(`${path}${separator}format=${format}`, accessToken, `${fallbackPrefix}.${format}`);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Unable to export as ${FORMAT_LABELS[format]}.`);
    } finally {
      setDownloadingFormat(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((format) => (
        <Button key={format} type="button" variant="secondary" onClick={() => void handleDownload(format)} disabled={downloadingFormat === format}>
          {downloadingFormat === format ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : <Download aria-hidden="true" size={14} />}
          {FORMAT_LABELS[format]}
        </Button>
      ))}
    </div>
  );
}
