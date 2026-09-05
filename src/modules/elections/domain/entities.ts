import type { ElectionConfig, ElectionStatus, PositionConfig } from "./election";
export interface ElectionRecord extends Omit<ElectionConfig, "type"> {
  id: string;
  type: "COUNCIL" | "CORE_COMMITTEE";
  status: ElectionStatus;
  configurationLockedAt: Date | null;
  createdAt: Date;
  // Stored rows remain numeric so legacy data can be rejected at the Council
  // lifecycle boundary rather than being asserted to be valid during reads.
  positions: (Omit<PositionConfig, "seats"> & { id: string; seats: number })[];
  applicationForm: { formId: string; title: string; status: string } | null;
}
export interface CandidateRecord {
  id: string;
  electionId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName: string;
  status:
    | "APPLIED"
    | "ELIGIBLE"
    | "INELIGIBLE"
    | "CORRECTION_REQUIRED"
    | "SHORTLISTED"
    | "WITHDRAWN"
    | "FINAL_CANDIDATE";
  createdAt: Date;
  positions: { id: string; title: string }[];
}
