import type { PublicationContent } from "../domain/blocks";
import type { ResolvedAlumniProfile, ResolvedCompany, ResolvedStats, ResolvedStudentProfile } from "../domain/entities";
import type { PublicationDataLookup } from "./ports/publication-data-lookup";

export interface ResolvedContentData {
  readonly students: Record<string, ResolvedStudentProfile>;
  readonly companies: Record<string, ResolvedCompany>;
  readonly alumni: Record<string, ResolvedAlumniProfile>;
  readonly stats: ResolvedStats | null;
}

/**
 * The one place that walks a block tree and resolves every data-bound
 * reference to its real, live record — used identically by the editor's
 * own Preview (§13.1 step 4, via GetPreviewDataUseCase) and by the export
 * job (PublicationExportJobHandler), so "Preview renders exactly as it will
 * export" holds for the data, not just the visual layout.
 */
export async function resolveContentData(content: PublicationContent, dataLookup: PublicationDataLookup): Promise<ResolvedContentData> {
  const studentIds = content.blocks.filter((b) => b.type === "STUDENT_PROFILE").map((b) => b.data.studentProfileId);
  const companyIds = content.blocks.filter((b) => b.type === "COMPANY_LOGO_GRID").flatMap((b) => b.data.companyIds);
  const alumniIds = content.blocks.filter((b) => b.type === "ALUMNI_PROFILE").map((b) => b.data.alumniProfileId);
  const needsStats = content.blocks.some((b) => b.type === "STAT_SUMMARY");

  const [students, companies, alumni, stats] = await Promise.all([
    dataLookup.resolveStudents(studentIds),
    dataLookup.resolveCompanies(companyIds),
    dataLookup.resolveAlumni(alumniIds),
    needsStats ? dataLookup.computeStats() : Promise.resolve(null),
  ]);

  return {
    students: Object.fromEntries(students.map((s) => [s.studentProfileId, s])),
    companies: Object.fromEntries(companies.map((c) => [c.companyId, c])),
    alumni: Object.fromEntries(alumni.map((a) => [a.alumniProfileId, a])),
    stats,
  };
}
