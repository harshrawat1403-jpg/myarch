/**
 * V3.0 User Directory (merged with Role Management — see the approved plan's
 * documented decision: the two spec bullets describe near-identical
 * read-only views, so one page/endpoint serves both rather than duplicating
 * a query). Framework-free Domain layer types only.
 */

export type DirectoryRole = "SECRETARY" | "COORDINATOR" | "STUDENT" | "RECRUITER";

/**
 * One row per account, regardless of role — a read-only projection assembled
 * from User plus whichever role-profile table applies. Never a mutation
 * target: every per-row action deep-links to that role's own management
 * page (Coordinators/Recruiters/Students) rather than acting from here.
 */
export interface DirectoryEntry {
  readonly userId: string;
  readonly profileId: string;
  readonly role: DirectoryRole;
  readonly fullName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  /** STUDENT/COORDINATOR-scoping context — undefined for RECRUITER/SECRETARY rows. */
  readonly batchId?: string;
  readonly batchName?: string;
  /** RECRUITER-only. */
  readonly companyName?: string;
}

export interface DirectorySearchFilters {
  readonly query?: string;
  readonly role?: DirectoryRole;
  readonly includeInactive?: boolean;
}
