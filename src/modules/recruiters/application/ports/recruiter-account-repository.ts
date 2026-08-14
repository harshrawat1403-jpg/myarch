import type {
  RecruiterAccountRecord,
  RecruiterAccountSearchFilters,
  RecruiterApprovalStatus,
} from "../../domain/entities";

export interface CreateRecruiterAccountData {
  userId: string;
  fullName: string;
  companyName: string;
  /** MYARCH Phase 1 — defaults to APPROVED at the schema level (existing admin-created behavior, unchanged); self-signup passes PENDING explicitly. */
  approvalStatus?: RecruiterApprovalStatus;
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

  /**
   * MYARCH Phase 1 — approves a self-signed-up (PENDING, User.isActive:
   * false) account AND activates its User in one transaction, so approval
   * actually grants login access. Distinct from setApprovalStatus (used by
   * RejectRecruiterUseCase, which must NOT touch isActive — a rejected
   * signup should never gain access): admin-created accounts never reach
   * PENDING in the first place, so this path is otherwise unreachable for
   * them.
   */
  approveAndActivate(id: string): Promise<RecruiterAccountRecord>;

  search(filters: RecruiterAccountSearchFilters): Promise<RecruiterAccountRecord[]>;
}
