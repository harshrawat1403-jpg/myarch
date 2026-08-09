export interface RecruiterInteractionRecord {
  readonly studentProfileId: string;
  readonly isSaved: boolean;
  readonly isShortlisted: boolean;
}

export interface RecruiterInteractionRepository {
  /** For merging save/shortlist state onto directory search results — one query for many students, not N+1. */
  findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInteractionRecord[]>;
  findOneForRecruiter(recruiterProfileId: string, studentProfileId: string): Promise<RecruiterInteractionRecord | null>;
  setSaved(recruiterProfileId: string, studentProfileId: string, saved: boolean): Promise<RecruiterInteractionRecord>;
  setShortlisted(
    recruiterProfileId: string,
    studentProfileId: string,
    isShortlisted: boolean,
  ): Promise<RecruiterInteractionRecord>;
  /** For the future /recruiter/saved view (C4) — every interaction row with savedAt set, for this recruiter. */
  listSavedForRecruiter(recruiterProfileId: string): Promise<RecruiterInteractionRecord[]>;
}
