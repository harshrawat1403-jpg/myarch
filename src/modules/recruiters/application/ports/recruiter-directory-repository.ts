import type {
  RecruiterDashboardStats,
  RecruiterSearchFilters,
  RecruiterStudentProfileDTO,
  ResumeReference,
} from "../../domain/entities";

/**
 * Recruiter-specific query surface — deliberately NOT the students module's
 * StudentRepository or the profiles module's PublishedProfileRepository.
 * Every implementation of this port must query StudentPublicProfile as its
 * root table (never StudentPrivateProfile or StudentPublicProfileDraft) so
 * that "only approved profiles are ever visible" is a structural property
 * of the query, not a filter that could be forgotten
 * (docs/architecture/05_System_Architecture.md's Core Data Flow).
 */
export interface RecruiterDirectoryRepository {
  search(filters: RecruiterSearchFilters): Promise<RecruiterStudentProfileDTO[]>;
  findByStudentId(studentId: string): Promise<RecruiterStudentProfileDTO | null>;
  getDashboardStats(): Promise<RecruiterDashboardStats>;
  getResumeReference(studentId: string): Promise<ResumeReference | null>;
}
