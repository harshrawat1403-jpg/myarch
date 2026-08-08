import type {
  RecruiterAccountRecord,
  RecruiterAccountSearchFilters,
  RecruiterApprovalStatus,
} from "../../domain/entities";

export interface CreateRecruiterAccountData {
  userId: string;
  fullName: string;
  companyName: string;
}

export interface UpdateRecruiterAccountData {
  fullName?: string;
  companyName?: string;
}

/**
 * Admin-side CRUD over RecruiterProfile — distinct from
 * recruiter-directory-repository.ts, which is the Recruiter role's own
 * read-only directory-browsing port. Different audience, different shape,
 * never merged (mirrors the RecruiterAccountRecord/RecruiterStudentProfileDTO
 * split in domain/entities.ts).
 */
export interface RecruiterAccountRepository {
  create(data: CreateRecruiterAccountData): Promise<RecruiterAccountRecord>;
  findById(id: string): Promise<RecruiterAccountRecord | null>;
  update(id: string, data: UpdateRecruiterAccountData): Promise<RecruiterAccountRecord>;
  setActive(id: string, isActive: boolean): Promise<RecruiterAccountRecord>;
  setApprovalStatus(id: string, status: RecruiterApprovalStatus): Promise<RecruiterAccountRecord>;
  search(filters: RecruiterAccountSearchFilters): Promise<RecruiterAccountRecord[]>;
}
