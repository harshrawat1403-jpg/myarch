import type { ResolvedAlumniProfile, ResolvedCompany, ResolvedStats, ResolvedStudentProfile } from "../../../src/modules/publications";
import type {
  PublicationDataLookup,
  SelectableAlumniOption,
  SelectableCompanyOption,
  SelectableStudentOption,
} from "../../../src/modules/publications/application/ports/publication-data-lookup";

export class FakePublicationDataLookup implements PublicationDataLookup {
  students: SelectableStudentOption[] = [];
  resolvedStudents: ResolvedStudentProfile[] = [];
  companies: SelectableCompanyOption[] = [];
  resolvedCompanies: ResolvedCompany[] = [];
  alumni: SelectableAlumniOption[] = [];
  resolvedAlumni: ResolvedAlumniProfile[] = [];
  stats: ResolvedStats = { totalApplications: 0, totalOffers: 0, totalPlaced: 0, totalDrives: 0, totalCompanies: 0 };

  async listSelectableStudents(batchId?: string): Promise<SelectableStudentOption[]> {
    return batchId ? this.students.filter((s) => s.batchId === batchId) : this.students;
  }

  async resolveStudents(studentProfileIds: readonly string[]): Promise<ResolvedStudentProfile[]> {
    return this.resolvedStudents.filter((s) => studentProfileIds.includes(s.studentProfileId));
  }

  async listSelectableCompanies(): Promise<SelectableCompanyOption[]> {
    return this.companies;
  }

  async resolveCompanies(companyIds: readonly string[]): Promise<ResolvedCompany[]> {
    return this.resolvedCompanies.filter((c) => companyIds.includes(c.companyId));
  }

  async listSelectableAlumni(): Promise<SelectableAlumniOption[]> {
    return this.alumni;
  }

  async resolveAlumni(alumniProfileIds: readonly string[]): Promise<ResolvedAlumniProfile[]> {
    return this.resolvedAlumni.filter((a) => alumniProfileIds.includes(a.alumniProfileId));
  }

  async computeStats(): Promise<ResolvedStats> {
    return this.stats;
  }
}
