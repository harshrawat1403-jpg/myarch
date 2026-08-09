/**
 * V4.0 E2 — a minimal, read-only port (same narrow-purpose pattern as
 * recruiters/secretary-recipient-lookup.ts and student-name-lookup.ts):
 * resolves who should be notified about registration-request activity,
 * without importing the coordinators/administration modules' Application
 * layers (this module's isolation rule — see index.ts).
 */
export interface RegistrationReviewerLookup {
  /** Every Coordinator scoped to this batch, plus every Secretary (unscoped — sees every batch) — the "who can review this" set for REGISTRATION_SUBMITTED. */
  listReviewerUserIds(batchId: string): Promise<string[]>;

  /** Every Secretary — REGISTRATION_REVIEWED only needs to reach the eventual decision-maker, not every Coordinator scoped to the batch (a Coordinator can only advise; telling them "reviewed" would just notify them about their own action). */
  listSecretaryUserIds(): Promise<string[]>;
}
