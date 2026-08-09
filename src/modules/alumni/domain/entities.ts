/**
 * Framework-free Domain layer types for the alumni module (V4.0 D5). The
 * one entity in this PRD where Secretary and Coordinator have byte-for-byte
 * identical CRUD authority (§4's permission matrix — "Manage alumni
 * records: Coordinator Full (operational), Secretary Full"), so this
 * module's permission surface is deliberately a single function, not a
 * manage/decide split.
 */

export interface AlumniRecord {
  readonly id: string;
  readonly studentProfileId: string | null;
  readonly fullName: string;
  readonly graduationYear: number;
  readonly currentCompany: string | null;
  readonly designation: string | null;
  readonly location: string | null;
  readonly portfolioUrl: string | null;
  readonly linkedInUrl: string | null;
  readonly mentorshipAvailable: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AlumniSearchFilters {
  readonly name?: string;
  readonly graduationYear?: number;
  readonly mentorshipAvailable?: boolean;
}
