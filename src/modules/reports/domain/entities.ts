import type { PlacementDriveType, ApplicationStatus } from "@/modules/placements";
import type { PublicationType, PublicationStatus, PublicationExportFormat, PublicationExportStatus } from "@/modules/publications";

/**
 * V4.0 E7 (PRD §16) — report DTOs. Every count here traces to a real
 * database aggregation (see the Prisma repositories in ../infrastructure) —
 * never a fabricated or cached number. See PlacementFunnelReport's own doc
 * comment for the funnel's precise, deliberately-chosen counting
 * methodology (it's the one place in this module where the definition is
 * genuinely non-obvious).
 */

export interface PlacementReportFilters {
  readonly type: PlacementDriveType;
  readonly batchIds?: readonly string[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

/**
 * The application funnel for one drive type (Placement or Internship).
 *
 * Metric definitions (documented once, here, rather than left ambiguous —
 * see this milestone's completion report for the full reasoning):
 * - `applied`: every Application row matching the filters — unconditional,
 *   since every row starts life as APPLIED and no ApplicationStatusEvent is
 *   ever written for that initial state (there is nothing to transition
 *   FROM), so this must come from a plain Application count, not the event
 *   log.
 * - `reachedShortlisted` / `reachedInterview` / `reachedOffer` /
 *   `reachedAccepted`: counted from `ApplicationStatusEvent` rows with that
 *   exact `toStatus` — i.e. "was ever shortlisted," not "is CURRENTLY
 *   shortlisted." This matters: the transition graph
 *   (application-lifecycle.ts) is strictly forward-only with REJECTED/
 *   WITHDRAWN as exits from any non-terminal state, so an application
 *   rejected right after its interview still correctly counts toward
 *   `reachedInterview` even though its *current* status is REJECTED. A
 *   naive `currentStatus === 'SHORTLISTED'` count would silently drop every
 *   application that progressed further (or was later rejected/withdrawn),
 *   undercounting the funnel — the exact "do not fabricate/undercount a
 *   metric" failure mode this report is required to avoid. Because the
 *   transition graph never revisits a status once left, one
 *   ApplicationStatusEvent row per (application, toStatus) pair is
 *   structurally guaranteed, so a plain row count never double-counts.
 * - `interviewsScheduled`: a distinct, direct-field count
 *   (`Application.interviewScheduledAt IS NOT NULL`) — answers "how many
 *   interviews were actually calendared," which is a different real
 *   question than "how many reached the INTERVIEW pipeline stage."
 * - `placed`: alias for `reachedAccepted` (ACCEPTED is the literal
 *   "Placed" definition — PRD §11: "'Placed' = ACCEPTED").
 */
export interface PlacementFunnelReport {
  readonly type: PlacementDriveType;
  readonly applied: number;
  readonly reachedShortlisted: number;
  readonly reachedInterview: number;
  readonly reachedOffer: number;
  readonly reachedAccepted: number;
  readonly placed: number;
  readonly interviewsScheduled: number;
  /** Current status of every in-scope application, right now — a snapshot, not a funnel; the report UI must not conflate the two. */
  readonly currentStatusBreakdown: readonly { readonly status: ApplicationStatus; readonly count: number }[];
  /** Companies with at least one OFFER-or-better application in scope — answers "which companies recruited." */
  readonly companiesRecruited: readonly { readonly companyName: string; readonly offersCount: number; readonly acceptedCount: number }[];
  readonly filters: PlacementReportFilters;
}

/** Student's own placement/internship activity — never another student's data (§4: Student Reports = "Own data only"). */
export interface MyPlacementActivityReport {
  readonly totalApplications: number;
  readonly interviewsScheduled: number;
  readonly offersReceived: number;
  readonly placed: boolean;
  readonly applications: readonly {
    readonly applicationId: string;
    readonly companyName: string;
    readonly title: string;
    readonly type: PlacementDriveType;
    readonly currentStatus: ApplicationStatus;
    readonly appliedAt: Date;
  }[];
}

/** Recruiter's own activity — never another recruiter's data, never institutional drive/application data they have no existing access to (§4: Recruiter Reports = "Own data only"). */
export interface MyRecruitingActivityReport {
  readonly savedCount: number;
  readonly shortlistedCount: number;
  readonly interestsSentCount: number;
  readonly interestsAcceptedCount: number;
  readonly interestsDeclinedCount: number;
  readonly interestsPendingCount: number;
  readonly interests: readonly { readonly studentName: string; readonly status: string; readonly sentAt: Date }[];
}

export interface AlumniReportFilters {
  readonly graduationYearFrom?: number;
  readonly graduationYearTo?: number;
  readonly mentorshipAvailableOnly?: boolean;
}

export interface AlumniReport {
  readonly totalAlumni: number;
  readonly mentorshipAvailableCount: number;
  readonly byGraduationYear: readonly { readonly graduationYear: number; readonly count: number }[];
  readonly filters: AlumniReportFilters;
}

export interface PublicationsUsageReportFilters {
  readonly type?: PublicationType;
}

export interface PublicationsUsageReport {
  readonly totalPublications: number;
  readonly byStatus: readonly { readonly status: PublicationStatus; readonly count: number }[];
  readonly byType: readonly { readonly type: PublicationType; readonly count: number }[];
  readonly exportsByFormat: readonly { readonly format: PublicationExportFormat; readonly count: number }[];
  readonly exportsByStatus: readonly { readonly status: PublicationExportStatus; readonly count: number }[];
  readonly filters: PublicationsUsageReportFilters;
}
