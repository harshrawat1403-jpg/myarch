export type RecruitmentEligibilityReason =
  | "BATCH_MISMATCH"
  | "PROGRAM_MISMATCH"
  | "CGPA_BELOW_REQUIREMENT"
  | "OPPORTUNITY_CLOSED"
  | "DEADLINE_PASSED";

export interface VerifiedStudentAcademicIdentity {
  readonly batchId: string;
  /** Null until MYARCH gains a canonical, non-student-editable program field. */
  readonly programCode: string | null;
  readonly cgpa: number | null;
}

export interface OpportunityEligibilityInput {
  readonly status: "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED";
  readonly deadline: Date | null;
  readonly minimumCgpa: number | null;
  readonly eligibleBatchIds: readonly string[];
  readonly eligibleProgramCodes: readonly string[];
}

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly reasons: readonly RecruitmentEligibilityReason[];
}

export function evaluateOpportunityEligibility(
  opportunity: OpportunityEligibilityInput,
  student: VerifiedStudentAcademicIdentity,
  now = new Date(),
): EligibilityResult {
  const reasons: RecruitmentEligibilityReason[] = [];
  if (opportunity.status !== "OPEN") reasons.push("OPPORTUNITY_CLOSED");
  if (opportunity.deadline && opportunity.deadline <= now) reasons.push("DEADLINE_PASSED");
  if (opportunity.eligibleBatchIds.length > 0 && !opportunity.eligibleBatchIds.includes(student.batchId)) reasons.push("BATCH_MISMATCH");
  if (opportunity.eligibleProgramCodes.length > 0 && (!student.programCode || !opportunity.eligibleProgramCodes.includes(student.programCode))) reasons.push("PROGRAM_MISMATCH");
  if (opportunity.minimumCgpa !== null && (student.cgpa === null || student.cgpa < opportunity.minimumCgpa)) reasons.push("CGPA_BELOW_REQUIREMENT");
  return { eligible: reasons.length === 0, reasons };
}
