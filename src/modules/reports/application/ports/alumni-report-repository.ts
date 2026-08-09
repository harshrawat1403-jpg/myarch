import type { AlumniReportFilters } from "../../domain/entities";

export interface AlumniReportCounts {
  readonly totalAlumni: number;
  readonly mentorshipAvailableCount: number;
  readonly byGraduationYear: readonly { readonly graduationYear: number; readonly count: number }[];
}

export interface AlumniReportRepository {
  getSummary(filters: AlumniReportFilters): Promise<AlumniReportCounts>;
}
