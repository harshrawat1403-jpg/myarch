/**
 * V4.0 D1 — a minimal, read-only port (same pattern as recruiters/
 * student-name-lookup.ts): ApplyToPlacementDriveUseCase needs the applying
 * student's batch/CGPA/backlog status to check drive eligibility, without
 * importing the students/profiles modules' application layers (module
 * isolation). V4.0 D3 extends it with fullName/batchName — the same
 * underlying StudentProfile+Batch row, now also needed to display the
 * Secretary/Coordinator application board (§14) without a second port.
 * V4.0 E2 adds userId — UpdateApplicationStatusUseCase's third real
 * consumer of this same row, needed to notify the applying student directly
 * (APPLICATION_STATUS_CHANGED).
 */
export interface StudentEligibilityData {
  readonly userId: string;
  readonly batchId: string;
  readonly batchName: string;
  readonly fullName: string;
  readonly cgpa: number | null;
  readonly hasActiveBacklog: boolean;
}

export interface StudentEligibilityLookup {
  findByStudentProfileId(studentProfileId: string): Promise<StudentEligibilityData | null>;

  /**
   * V4.0 E2 — PublishPlacementDriveUseCase's fan-out for
   * PLACEMENT_DRIVE_ANNOUNCED. Deliberately batch-only, matching
   * ListOpenDrivesForStudentUseCase's own visibility filter exactly (which
   * also checks only `eligibleBatchIds`, never minCgpa/backlogAllowance) —
   * this is not a simplification, it's staying consistent with what "open
   * drives" already means elsewhere in this codebase. An empty `batchIds`
   * array means every batch (mirrors the drive's own "no restriction"
   * convention), matching a real drive with no eligibility restriction.
   */
  listUserIdsForBatches(batchIds: readonly string[]): Promise<string[]>;
}
