import type { BatchStatus } from "@/modules/batches";

/**
 * Framework-free Domain layer types for the students module. Deliberately
 * separate shapes for private vs. public-ish data — never one combined
 * "student" type with an ambiguous visibility flag
 * (docs/database/08_Database_Design.md's structural separation principle,
 * carried into this module's own type design).
 */

export interface StudentIdentity {
  readonly id: string;
  readonly userId: string;
  readonly batchId: string;
  readonly rollNumber: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StudentPrivateFields {
  readonly phone: string | null;
  readonly personalEmail: string | null;
  readonly cgpa: number | null;
  readonly hasActiveBacklog: boolean;
  readonly backlogDetails: string | null;
  readonly internalRemarks: string | null;
}

/** The full admin-facing record: identity + private fields. Never returned to a Recruiter-facing path. */
export interface StudentRecord extends StudentIdentity {
  readonly private: StudentPrivateFields;
}

export interface StudentSearchFilters {
  readonly name?: string;
  readonly rollNumber?: string;
  readonly batchId?: string;
  readonly batchStatus?: BatchStatus;
  readonly skills?: readonly string[];
  readonly software?: readonly string[];
  readonly cgpaMin?: number;
  readonly cgpaMax?: number;
  readonly includeInactive?: boolean;
}

/**
 * A row in the admin search directory. Includes CGPA — this is safe ONLY
 * because every caller of the search use case has already been proven to
 * hold private-profile access (Secretary, or a Coordinator scoped to the
 * batches being searched); this type must never be reused for a
 * Recruiter-facing or public projection (docs/security/09_User_Roles_and_Permissions.md).
 */
export interface StudentSearchResultItem {
  readonly id: string;
  readonly rollNumber: string;
  readonly fullName: string;
  readonly batchId: string;
  readonly batchName: string;
  readonly batchStatus: BatchStatus;
  readonly isActive: boolean;
  readonly cgpa: number | null;
  readonly hasActiveBacklog: boolean;
  readonly skills: readonly string[];
  readonly software: readonly string[];
}

export interface ConfidentialDocumentReference {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

/**
 * V3.0 Administration Platform: Bulk CSV Student Import, run asynchronously
 * via the Job queue (see infrastructure/bulk-import-job-handler.ts) so a
 * multi-hundred-row roster upload never ties up an HTTP request.
 */
export type BulkImportRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";

export interface BulkImportRowError {
  readonly row: number;
  readonly rollNumber?: string;
  readonly email?: string;
  readonly error: string;
}

export interface BulkImportRunRecord {
  readonly id: string;
  readonly actorUserId: string;
  readonly batchId: string;
  readonly status: BulkImportRunStatus;
  readonly totalRows: number;
  readonly processedRows: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly errorReport: readonly BulkImportRowError[];
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}
