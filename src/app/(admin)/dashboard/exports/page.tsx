"use client";

import { useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * One entry per export type. `formats` is an array (not a single value) so
 * a future format (XLSX, PDF) is a matter of adding a string to this list
 * and a corresponding case in `handleExport` — the card layout itself
 * never needs to change (Day 10's "design so additional formats can be
 * added later without redesigning the UI" requirement).
 */
interface ExportDefinition {
  id: string;
  title: string;
  description: string;
  path: string;
  fallbackFilename: string;
  formats: readonly string[];
  secretaryOnly?: boolean;
}

const EXPORT_DEFINITIONS: readonly ExportDefinition[] = [
  {
    id: "students",
    title: "Student Directory",
    description: "Name, roll number, batch, institute email, skills, software, and resume/portfolio availability for every student in scope.",
    path: "/api/exports/students",
    fallbackFilename: "student-directory.csv",
    formats: ["CSV"],
  },
  {
    id: "batches",
    title: "Batch Report",
    description: "Per-batch totals: status, total students, active students, and archived students.",
    path: "/api/exports/batches",
    fallbackFilename: "batch-report.csv",
    formats: ["CSV"],
  },
  {
    id: "public-profiles",
    title: "Public Placement Dataset",
    description: "Approved public profile data only — bio, skills, software, certifications, internships, and portfolio links. The intended data source for the future Placement Brochure Builder.",
    path: "/api/exports/public-profiles",
    fallbackFilename: "public-placement-dataset.csv",
    formats: ["CSV"],
  },
  {
    id: "recruiters",
    title: "Recruiter Directory",
    description: "Company, contact person, and official email for every registered recruiter account. Secretary only.",
    path: "/api/exports/recruiters",
    fallbackFilename: "recruiter-directory.csv",
    formats: ["CSV"],
    secretaryOnly: true,
  },
];

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const { accessToken, role } = useAuth();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleExports = EXPORT_DEFINITIONS.filter((def) => !def.secretaryOnly || role === "SECRETARY");

  async function handleExport(definition: ExportDefinition) {
    if (!accessToken) return;
    setError(null);
    setExportingId(definition.id);
    try {
      const { blob, filename } = await apiClient.download(definition.path, accessToken, definition.fallbackFilename);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Unable to export ${definition.title}.`);
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">Exports</h1>
      <p className="text-sm text-[--color-text-secondary]">
        Administrative CSV exports for the Department T&amp;P Team. Recruiters and students never have access to this section.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleExports.map((definition) => (
          <div
            key={definition.id}
            className="flex flex-col justify-between rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[--color-text-primary]">
                  {definition.title}
                </h2>
                <div className="flex gap-1">
                  {definition.formats.map((format) => (
                    <Badge key={format} variant="neutral">
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-[--color-text-secondary]">{definition.description}</p>
            </div>
            <Button
              variant="primary"
              className="mt-4 self-start"
              onClick={() => handleExport(definition)}
              disabled={exportingId === definition.id}
            >
              {exportingId === definition.id ? "Exporting…" : `Export ${definition.formats[0]}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
