import type { ExportColumn } from "@/lib/csv";
import type { AlumniReport, MyPlacementActivityReport, MyRecruitingActivityReport, PlacementFunnelReport, PublicationsUsageReport } from "../domain/entities";

/**
 * V4.0 E7 — one `ExportColumn<T>` array per report's CSV/XLSX download,
 * same pattern as exports/presentation/columns.ts. Each report's tabular
 * breakdown (the genuinely multi-row part) is what gets exported — the
 * top-line summary metrics are covered by the JSON view + the PPTX summary
 * slide, not duplicated into a one-row CSV.
 */

export const PLACEMENT_COMPANIES_COLUMNS: readonly ExportColumn<PlacementFunnelReport["companiesRecruited"][number]>[] = [
  { header: "Company", value: (row) => row.companyName },
  { header: "Offers Extended", value: (row) => String(row.offersCount) },
  { header: "Accepted / Placed", value: (row) => String(row.acceptedCount) },
];

export const ALUMNI_BY_YEAR_COLUMNS: readonly ExportColumn<AlumniReport["byGraduationYear"][number]>[] = [
  { header: "Graduation Year", value: (row) => String(row.graduationYear) },
  { header: "Alumni Count", value: (row) => String(row.count) },
];

export interface PublicationsBreakdownRow {
  readonly dimension: "Status" | "Type";
  readonly value: string;
  readonly count: number;
}

export const PUBLICATIONS_BREAKDOWN_COLUMNS: readonly ExportColumn<PublicationsBreakdownRow>[] = [
  { header: "Dimension", value: (row) => row.dimension },
  { header: "Value", value: (row) => row.value },
  { header: "Count", value: (row) => String(row.count) },
];

export function publicationsBreakdownRows(report: PublicationsUsageReport): PublicationsBreakdownRow[] {
  return [
    ...report.byStatus.map((s) => ({ dimension: "Status" as const, value: s.status, count: s.count })),
    ...report.byType.map((t) => ({ dimension: "Type" as const, value: t.type, count: t.count })),
  ];
}

export const MY_APPLICATIONS_COLUMNS: readonly ExportColumn<MyPlacementActivityReport["applications"][number]>[] = [
  { header: "Company", value: (row) => row.companyName },
  { header: "Drive", value: (row) => row.title },
  { header: "Type", value: (row) => row.type },
  { header: "Current Status", value: (row) => row.currentStatus },
  { header: "Applied On", value: (row) => row.appliedAt.toISOString().slice(0, 10) },
];

export const MY_INTERESTS_COLUMNS: readonly ExportColumn<MyRecruitingActivityReport["interests"][number]>[] = [
  { header: "Student", value: (row) => row.studentName },
  { header: "Status", value: (row) => row.status },
  { header: "Sent On", value: (row) => row.sentAt.toISOString().slice(0, 10) },
];
