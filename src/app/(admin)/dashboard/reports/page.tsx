"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Download, FileSpreadsheet, GraduationCap, Layers, Sparkles, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";

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
  category: "data" | "account";
  secretaryOnly?: boolean;
  icon: LucideIcon;
}

const EXPORT_DEFINITIONS: readonly ExportDefinition[] = [
  {
    id: "students",
    title: "Student Directory",
    description: "Name, roll number, batch, institute email, skills, software, and resume/portfolio availability for every student in scope.",
    path: "/api/exports/students",
    fallbackFilename: "student-directory.csv",
    formats: ["CSV", "XLSX"],
    category: "data",
    icon: Users,
  },
  {
    id: "batches",
    title: "Batch Report",
    description: "Per-batch totals: status, total students, active students, and archived students.",
    path: "/api/exports/batches",
    fallbackFilename: "batch-report.csv",
    formats: ["CSV", "XLSX"],
    category: "data",
    icon: Layers,
  },
  {
    id: "public-profiles",
    title: "Public Placement Dataset",
    description: "Approved public profile data only — bio, skills, software, certifications, internships, and portfolio links. The intended data source for the future Placement Brochure Builder.",
    path: "/api/exports/public-profiles",
    fallbackFilename: "public-placement-dataset.csv",
    formats: ["CSV", "XLSX"],
    category: "data",
    icon: Sparkles,
  },
  {
    id: "recruiters",
    title: "Recruiter Directory",
    description: "Company, contact person, official email, and current active drives for every registered recruiter account.",
    path: "/api/exports/recruiters",
    fallbackFilename: "recruiter-directory.csv",
    formats: ["CSV", "XLSX"],
    category: "account",
    secretaryOnly: true,
    icon: FileSpreadsheet,
  },
];

const CATEGORY_LABELS: Record<ExportDefinition["category"], string> = {
  data: "Student & Batch Data",
  account: "Account Data",
};

interface InstitutionalReportDefinition {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/** V4.0 E7 (PRD §16 — "New report types: Placements, Internships, Alumni, Publications usage"). Each links to its own detail page (filters, summary metrics, breakdown tables, CSV/XLSX/PPTX export) rather than being crammed into this index. */
const INSTITUTIONAL_REPORTS: readonly InstitutionalReportDefinition[] = [
  { id: "placements", title: "Placement Statistics", description: "Application funnel, offers, placements, and which companies recruited.", href: "/dashboard/reports/placements", icon: TrendingUp },
  { id: "internships", title: "Internship Statistics", description: "The same funnel, scoped to internship drives.", href: "/dashboard/reports/internships", icon: Briefcase },
  { id: "alumni", title: "Alumni Report", description: "Alumni counts by graduation year and mentorship availability.", href: "/dashboard/reports/alumni", icon: GraduationCap },
  { id: "publications", title: "Publications Usage", description: "Publication counts by status and type, plus export activity.", href: "/dashboard/reports/publications", icon: FileSpreadsheet },
];

/**
 * V4.0 E7 (PRD §16) — the renamed/extended Reports Center (was Exports).
 * `EXPORT_DEFINITIONS`, `handleExport`, and the Secretary-only visibility
 * filter for the four original directory-style CSV exports are unchanged
 * (just gained an XLSX option) — no authorization behavior changed there.
 * New: an Institutional Reports section above it, per §16's four new
 * report types.
 */
export default function ReportsPage() {
  const { accessToken, role } = useAuth();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleExports = EXPORT_DEFINITIONS.filter((def) => !def.secretaryOnly || role === "SECRETARY");
  const categories = (["data", "account"] as const)
    .map((category) => ({ category, items: visibleExports.filter((def) => def.category === category) }))
    .filter((group) => group.items.length > 0);

  async function handleExport(definition: ExportDefinition, format: "CSV" | "XLSX") {
    if (!accessToken) return;
    setError(null);
    setExportingId(`${definition.id}-${format}`);
    try {
      const separator = definition.path.includes("?") ? "&" : "?";
      const path = format === "XLSX" ? `${definition.path}${separator}format=xlsx` : definition.path;
      const { blob, filename } = await apiClient.download(path, accessToken, definition.fallbackFilename.replace(".csv", format === "XLSX" ? ".xlsx" : ".csv"));
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Unable to export ${definition.title}.`);
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Reports
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Institutional reports and administrative data exports for Admin.
        </p>
      </div>

      <div>
        <DataLabel className="mb-3">Institutional Reports</DataLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INSTITUTIONAL_REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.id} href={report.href}>
                <Card className="flex h-full flex-col justify-between transition-shadow duration-150 hover:shadow-md">
                  <div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
                      <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
                    </span>
                    <CardTitle className="mt-3">{report.title}</CardTitle>
                    <p className="mt-1 text-sm text-(--color-text-secondary)">{report.description}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      {categories.map((group) => (
        <div key={group.category}>
          <DataLabel className="mb-3">{CATEGORY_LABELS[group.category]}</DataLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.items.map((definition) => {
              const Icon = definition.icon;
              return (
                <Card
                  key={definition.id}
                  className="flex flex-col justify-between transition-shadow duration-150 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
                        <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
                      </span>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {definition.secretaryOnly && <Badge variant="pending">Secretary Only</Badge>}
                        {definition.formats.map((format) => (
                          <Badge key={format} variant="neutral">
                            {format}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardTitle className="mt-3">{definition.title}</CardTitle>
                    <p className="mt-1 text-sm text-(--color-text-secondary)">{definition.description}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {definition.formats.map((format) => (
                      <Button
                        key={format}
                        variant="primary"
                        className="gap-2"
                        onClick={() => handleExport(definition, format as "CSV" | "XLSX")}
                        disabled={exportingId === `${definition.id}-${format}`}
                      >
                        <Download aria-hidden="true" size={16} strokeWidth={1.75} />
                        {exportingId === `${definition.id}-${format}` ? "Exporting…" : `Export ${format}`}
                      </Button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
