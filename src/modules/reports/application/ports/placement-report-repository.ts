import type { ApplicationStatus, PlacementDriveType } from "@/modules/placements";
import type { PlacementReportFilters } from "../../domain/entities";

export interface PlacementFunnelCounts {
  readonly applied: number;
  readonly reachedShortlisted: number;
  readonly reachedInterview: number;
  readonly reachedOffer: number;
  readonly reachedAccepted: number;
  readonly interviewsScheduled: number;
  readonly currentStatusBreakdown: readonly { readonly status: ApplicationStatus; readonly count: number }[];
  readonly companiesRecruited: readonly { readonly companyName: string; readonly offersCount: number; readonly acceptedCount: number }[];
}

export interface MyApplicationRow {
  readonly applicationId: string;
  readonly companyName: string;
  readonly title: string;
  readonly type: PlacementDriveType;
  readonly currentStatus: ApplicationStatus;
  readonly appliedAt: Date;
  readonly interviewScheduledAt: Date | null;
  /** Ever reached OFFER, per ApplicationStatusEvent — same "ever reached," not "currently at," methodology as the institutional funnel (see PlacementFunnelReport's doc comment), applied here too so a later rejection/withdrawal after an offer doesn't silently erase it from the student's own summary. */
  readonly everReceivedOffer: boolean;
  readonly everAccepted: boolean;
}

/**
 * V4.0 E7 — direct-Prisma, cross-module aggregation, mirroring the
 * now-twice-established pattern (PublicationDataLookup, GlobalSearchRepository):
 * one cohesive, read-only port per reporting concern, queried straight from
 * the underlying tables rather than re-composing another module's
 * Application-layer use cases (placements/index.ts deliberately exports
 * only route handlers + domain types, no use-case singletons, so there is
 * nothing to compose here even if that were the house style elsewhere).
 */
export interface PlacementReportRepository {
  /** Institutional funnel — Secretary (unfiltered) or Coordinator (batchIds = their scope). */
  getFunnel(filters: PlacementReportFilters): Promise<PlacementFunnelCounts>;

  /** A single student's own applications — never another student's. */
  listMyApplications(studentProfileId: string): Promise<readonly MyApplicationRow[]>;
}
