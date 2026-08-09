/**
 * V4.0 C3 — a minimal, read-only port (same pattern as recruiter-self-lookup.ts):
 * RespondToInterestUseCase needs the accepting student's display name for the
 * Secretary facilitation notification's context, without importing the
 * students/profiles modules' application layers (this module's isolation
 * rule — see index.ts). V4.0 E2 adds findUserIdById — ExpressInterestUseCase's
 * second real consumer of this same port, needed to notify the student
 * directly (RECRUITER_INTEREST_RECEIVED) without a parallel lookup.
 */
export interface StudentNameLookup {
  findFullNameById(studentProfileId: string): Promise<string | null>;
  findUserIdById(studentProfileId: string): Promise<string | null>;
}
