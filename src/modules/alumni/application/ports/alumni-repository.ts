import type { AlumniApprovalStatus, AlumniRecord, AlumniSearchFilters } from "../../domain/entities";

export interface CreateAlumniData {
  studentProfileId?: string | null;
  /** MYARCH Phase 1 — set only by SignupAlumniUseCase; admin-created rows leave this undefined (no login account). */
  userId?: string;
  fullName: string;
  graduationYear: number;
  currentCompany?: string | null;
  designation?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  linkedInUrl?: string | null;
  mentorshipAvailable?: boolean;
  /** MYARCH Phase 1 — defaults to APPROVED at the schema level (existing admin-created behavior, unchanged); self-signup passes PENDING explicitly. */
  approvalStatus?: AlumniApprovalStatus;
}

export interface UpdateAlumniData {
  fullName?: string;
  graduationYear?: number;
  currentCompany?: string | null;
  designation?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  linkedInUrl?: string | null;
  mentorshipAvailable?: boolean;
}

export interface AlumniRepository {
  create(data: CreateAlumniData): Promise<AlumniRecord>;
  findById(id: string): Promise<AlumniRecord | null>;
  update(id: string, data: UpdateAlumniData): Promise<AlumniRecord>;
  delete(id: string): Promise<void>;
  search(filters: AlumniSearchFilters): Promise<AlumniRecord[]>;

  /** MYARCH Phase 1 — set by RejectAlumniUseCase; never touches User.isActive (which stays false, blocking login). */
  setApprovalStatus(id: string, status: AlumniApprovalStatus): Promise<AlumniRecord>;

  /**
   * MYARCH Phase 1 — approves a self-signed-up (PENDING, User.isActive:
   * false) account AND activates its User in one transaction, mirroring
   * RecruiterAccountRepository.approveAndActivate exactly.
   */
  approveAndActivate(id: string): Promise<AlumniRecord>;
}
