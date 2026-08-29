/**
 * MYARCH Phase 4 (§5) — resolves the two facts isActorInAudience/audienceScopeFor
 * need to match COMMITTEE/COUNCIL audiences, mirroring StudentBatchLookup's
 * own shape for YEAR. Deliberately two cheap booleans/lists rather than a
 * dependency on the committees module itself — announcements only needs
 * "which committees" and "are they on the Council", never a full CommitteeRecord.
 */
export interface CommitteeMembershipLookup {
  /** Every Committee id this user currently (isActive) belongs to. */
  listActiveCommitteeIds(userId: string): Promise<string[]>;
  /** Whether this user currently belongs to any committee of type STUDENT_COUNCIL. */
  isActiveStudentCouncilMember(userId: string): Promise<boolean>;
}
