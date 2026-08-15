/** Resolves a Student's current batch for YEAR-audience matching (isActorInAudience/audienceScopeFor). Null for a non-Student or a Student with no active profile. */
export interface StudentBatchLookup {
  findBatchIdByUserId(userId: string): Promise<string | null>;
}
