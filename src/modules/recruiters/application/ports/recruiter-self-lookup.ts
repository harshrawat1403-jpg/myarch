/**
 * A minimal, read-only port resolving the acting Recruiter's own
 * RecruiterProfile id from their userId — mirrors src/lib/batch-lookup.ts's
 * narrow-purpose pattern. No existing recruiter-facing use case needed this
 * before C1 (search/get/dashboard/resume are all about students, never the
 * recruiter's own identity). V4.0 E2 adds companyName — ExpressInterestUseCase
 * needs it for the RECRUITER_INTEREST_RECEIVED notification's context, and
 * it's the same RecruiterProfile row this port already reads.
 */
export interface RecruiterSelfLookup {
  findByUserId(userId: string): Promise<{ id: string; companyName: string } | null>;
}
