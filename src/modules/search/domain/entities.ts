import type { PlacementDriveStatus } from "@/modules/placements";
import type { PublicationStatus } from "@/modules/publications";

/**
 * V4.0 E6 (PRD §15) — global search result shapes. Deliberately minimal
 * (id + the handful of fields the CommandPalette actually renders/links
 * with), never the full record: a search result is a display-and-navigate
 * affordance, not a data-fetching shortcut. In particular this keeps CGPA
 * (present on the staff-only StudentSearchResultItem used by
 * SearchStudentsUseCase) structurally impossible to leak through search.
 */
export interface StudentSearchResult {
  readonly kind: "STUDENT";
  readonly id: string;
  readonly fullName: string;
  readonly batchName: string;
  /** Staff-only — a Recruiter's result never carries a roll number, mirroring RecruiterStudentProfileDTO's own whitelist (it has no rollNumber field either). */
  readonly rollNumber: string | null;
}

export interface CompanySearchResult {
  readonly kind: "COMPANY";
  readonly id: string;
  readonly name: string;
  readonly sector: string | null;
}

export interface DriveSearchResult {
  readonly kind: "DRIVE";
  readonly id: string;
  readonly title: string;
  readonly companyName: string;
  readonly status: PlacementDriveStatus;
}

export interface PublicationSearchResult {
  readonly kind: "PUBLICATION";
  readonly id: string;
  readonly title: string;
  readonly status: PublicationStatus;
}

export type GlobalSearchResultItem = StudentSearchResult | CompanySearchResult | DriveSearchResult | PublicationSearchResult;

export interface GlobalSearchResults {
  readonly students: readonly StudentSearchResult[];
  readonly companies: readonly CompanySearchResult[];
  readonly drives: readonly DriveSearchResult[];
  readonly publications: readonly PublicationSearchResult[];
}
