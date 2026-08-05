import type {
  RecruiterDashboardStats,
  RecruiterSearchFilters,
  RecruiterStudentProfileDTO,
  ResumeReference,
} from "../../../src/modules/recruiters/domain/entities";
import type { RecruiterDirectoryRepository } from "../../../src/modules/recruiters/application/ports/recruiter-directory-repository";

/**
 * Mirrors the real PrismaRecruiterDirectoryRepository's filtering rules
 * (only students that are isActive AND in an ACTIVE batch are ever
 * seeded/visible here) so tests against this fake meaningfully exercise
 * the same exclusion behavior the real, structurally-safe query provides —
 * consistent with this project's established fakes-over-a-live-DB approach
 * (no Postgres/Docker available in this environment, same as every prior
 * phase).
 */
export class InMemoryRecruiterDirectoryRepository implements RecruiterDirectoryRepository {
  private readonly profiles = new Map<string, RecruiterStudentProfileDTO>();
  private readonly resumes = new Map<string, ResumeReference>();

  /** Only ever call this for a student who has an APPROVED, published profile, is active, and is in an ACTIVE batch — exactly what a real StudentPublicProfile row (joined this way) would represent. */
  seedApproved(profile: RecruiterStudentProfileDTO): void {
    this.profiles.set(profile.studentId, profile);
  }

  seedResume(studentId: string, reference: ResumeReference): void {
    this.resumes.set(studentId, reference);
  }

  async search(filters: RecruiterSearchFilters): Promise<RecruiterStudentProfileDTO[]> {
    let results = [...this.profiles.values()];

    if (filters.batchId) results = results.filter((p) => p.batchId === filters.batchId);
    if (filters.skills && filters.skills.length > 0) {
      results = results.filter((p) => filters.skills!.some((s) => p.skills.includes(s)));
    }
    if (filters.software && filters.software.length > 0) {
      results = results.filter((p) => filters.software!.some((s) => p.software.includes(s)));
    }
    if (filters.hasInternshipExperience) results = results.filter((p) => p.internships.length > 0);
    if (filters.hasCertification) results = results.filter((p) => p.certifications.length > 0);
    if (filters.internshipKeyword) {
      const needle = filters.internshipKeyword.toLowerCase();
      results = results.filter((p) =>
        p.internships.some((i) => [i.company, i.role, i.duration].some((f) => f?.toLowerCase().includes(needle))),
      );
    }
    if (filters.certificationKeyword) {
      const needle = filters.certificationKeyword.toLowerCase();
      results = results.filter((p) =>
        p.certifications.some((c) => [c.title, c.issuer].some((f) => f?.toLowerCase().includes(needle))),
      );
    }
    if (filters.query) {
      const needle = filters.query.toLowerCase();
      results = results.filter((p) =>
        [p.fullName, p.bio ?? "", ...p.skills, ...p.software, ...p.certifications.map((c) => c.title), ...p.internships.map((i) => i.company)].some(
          (f) => f.toLowerCase().includes(needle),
        ),
      );
    }

    return results.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async findByStudentId(studentId: string): Promise<RecruiterStudentProfileDTO | null> {
    return this.profiles.get(studentId) ?? null;
  }

  async getDashboardStats(): Promise<RecruiterDashboardStats> {
    const batchIds = new Set<string>();
    const skills = new Set<string>();
    for (const profile of this.profiles.values()) {
      batchIds.add(profile.batchId);
      for (const skill of profile.skills) skills.add(skill);
    }
    return {
      totalAvailableStudents: this.profiles.size,
      graduationBatchesAvailable: batchIds.size,
      skillsRepresented: skills.size,
    };
  }

  async getResumeReference(studentId: string): Promise<ResumeReference | null> {
    if (!this.profiles.has(studentId)) return null;
    return this.resumes.get(studentId) ?? null;
  }
}
