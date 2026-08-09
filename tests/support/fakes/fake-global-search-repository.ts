import type { CompanySearchResult, PublicationSearchResult, StudentSearchResult } from "../../../src/modules/search";
import type { DriveSearchRow, GlobalSearchRepository } from "../../../src/modules/search/application/ports/global-search-repository";

export class FakeGlobalSearchRepository implements GlobalSearchRepository {
  staffStudents: StudentSearchResult[] = [];
  recruiterStudents: StudentSearchResult[] = [];
  companies: CompanySearchResult[] = [];
  drives: DriveSearchRow[] = [];
  publications: PublicationSearchResult[] = [];
  studentBatchIds: Record<string, string> = {};

  /** Records every call made — lets tests assert scoping/limit args were passed through correctly. */
  readonly calls: { method: string; args: unknown[] }[] = [];

  async searchStudentsForStaff(query: string, opts: { batchIds?: readonly string[]; limit: number }): Promise<StudentSearchResult[]> {
    // Real batch-scoping happens inside the SQL WHERE clause in production
    // (PrismaGlobalSearchRepository) — this fake just records the call so
    // tests can assert the use case requested the right scope; it doesn't
    // re-simulate the filter itself.
    this.calls.push({ method: "searchStudentsForStaff", args: [query, opts] });
    return this.staffStudents.slice(0, opts.limit);
  }

  async searchStudentsForRecruiter(query: string, limit: number): Promise<StudentSearchResult[]> {
    this.calls.push({ method: "searchStudentsForRecruiter", args: [query, limit] });
    return this.recruiterStudents.slice(0, limit);
  }

  async searchCompanies(query: string, limit: number): Promise<CompanySearchResult[]> {
    this.calls.push({ method: "searchCompanies", args: [query, limit] });
    return this.companies.slice(0, limit);
  }

  async searchDrives(query: string, limit: number): Promise<DriveSearchRow[]> {
    this.calls.push({ method: "searchDrives", args: [query, limit] });
    return this.drives.slice(0, limit);
  }

  async searchPublications(query: string, limit: number): Promise<PublicationSearchResult[]> {
    this.calls.push({ method: "searchPublications", args: [query, limit] });
    return this.publications.slice(0, limit);
  }

  async findStudentBatchId(studentProfileId: string): Promise<string | null> {
    this.calls.push({ method: "findStudentBatchId", args: [studentProfileId] });
    return this.studentBatchIds[studentProfileId] ?? null;
  }
}
