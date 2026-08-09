export interface RecruitingActivityCounts {
  readonly savedCount: number;
  readonly shortlistedCount: number;
  readonly interestsSentCount: number;
  readonly interestsAcceptedCount: number;
  readonly interestsDeclinedCount: number;
  readonly interestsPendingCount: number;
  readonly interests: readonly { readonly studentName: string; readonly status: string; readonly sentAt: Date }[];
}

/** A single recruiter's own saved/shortlisted/interest activity — never another recruiter's. */
export interface RecruitingActivityRepository {
  getForRecruiter(recruiterProfileId: string): Promise<RecruitingActivityCounts>;
  /** Resolves the RecruiterProfile id for the authenticated user — mirrors RecruiterSelfLookup's existing role in the recruiters module. */
  findRecruiterProfileId(userId: string): Promise<string | null>;
}
