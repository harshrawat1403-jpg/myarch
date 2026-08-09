import type { InternshipOutcomeRecord } from "../../domain/entities";

export interface InternshipOutcomeRepository {
  /** Called once, automatically, when an Application on an INTERNSHIP drive reaches ACTIVE. */
  create(applicationId: string): Promise<InternshipOutcomeRecord>;
  findByApplicationId(applicationId: string): Promise<InternshipOutcomeRecord | null>;
  setCompanyFeedback(applicationId: string, companyFeedback: string): Promise<InternshipOutcomeRecord>;
  setStudentFeedback(applicationId: string, studentFeedback: string): Promise<InternshipOutcomeRecord>;
  setCertificateFileId(applicationId: string, certificateFileId: string | null): Promise<InternshipOutcomeRecord>;
  /** Called once, automatically, when the same Application transitions to COMPLETED. */
  setCompletedAt(applicationId: string, completedAt: Date): Promise<InternshipOutcomeRecord>;
}
