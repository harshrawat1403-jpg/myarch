import type { AlumniReportFilters } from "../../../src/modules/reports/domain/entities";
import type { AlumniReportCounts, AlumniReportRepository } from "../../../src/modules/reports/application/ports/alumni-report-repository";

const EMPTY: AlumniReportCounts = { totalAlumni: 0, mentorshipAvailableCount: 0, byGraduationYear: [] };

export class FakeAlumniReportRepository implements AlumniReportRepository {
  result: AlumniReportCounts = EMPTY;
  readonly calls: AlumniReportFilters[] = [];

  async getSummary(filters: AlumniReportFilters): Promise<AlumniReportCounts> {
    this.calls.push(filters);
    return this.result;
  }
}
