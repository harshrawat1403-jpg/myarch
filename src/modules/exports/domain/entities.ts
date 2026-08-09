import type { BatchStatus } from "@/modules/batches";

/**
 * One DTO per export, each an explicit whitelist — never a Prisma model,
 * never `...row` (docs' Day 10 "no object spreading" requirement). A new
 * column added to any underlying table in a future migration does not
 * automatically appear in an export; a developer must deliberately add a
 * field to both the relevant DTO here and its mapper in
 * infrastructure/*.ts. Same structural discipline as
 * recruiters/domain/entities.ts's RecruiterStudentProfileDTO (Days 8–9).
 */

/** "Never include: Password, Hashes, CGPA, Backlogs, Personal Email, Phone, Internal Remarks, Confidential Documents." */
export interface StudentDirectoryRow {
  readonly fullName: string;
  readonly rollNumber: string;
  readonly batchName: string;
  readonly instituteEmail: string;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly resumeAvailable: boolean;
  readonly portfolioAvailable: boolean;
  readonly activeStatus: boolean;
}

export interface BatchReportRow {
  readonly batchName: string;
  readonly status: BatchStatus;
  readonly totalStudents: number;
  readonly activeStudents: number;
  readonly archivedStudents: number;
}

/** "Export ONLY approved StudentPublicProfile information... Never include: Draft information, Approval status, Internal comments, Private information." */
export interface PublicPlacementRow {
  readonly fullName: string;
  readonly batchName: string;
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly certifications: readonly string[];
  readonly internshipExperience: readonly string[];
  readonly portfolioLinks: readonly string[];
  readonly resumeAvailable: boolean;
}

/**
 * V4.0 E7: `activeDrives` is now a real, computed count (PlacementDrive
 * shipped in D1) — matched by company name, since RecruiterProfile has no
 * Company FK (see PrismaRecruiterDirectoryExportRepository's doc comment).
 */
export interface RecruiterDirectoryRow {
  readonly company: string;
  readonly contactPerson: string;
  readonly officialEmail: string;
  readonly activeDrives: number;
}

export interface ExportScope {
  /** undefined = unrestricted (Secretary); an array (possibly empty) = exactly the Coordinator's assigned batches. */
  readonly batchIds?: readonly string[];
}
