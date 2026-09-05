import type {
  CoreCommitteeSelectionConfig,
  CoreCommitteeSelectionPositionConfig,
  CoreCommitteeSelectionStatus,
} from "./core-committee-selection";
export interface CoreCommitteeSelectionRecord extends CoreCommitteeSelectionConfig {
  id: string;
  status: CoreCommitteeSelectionStatus;
  configurationLockedAt: Date | null;
  createdAt: Date;
  positions: (CoreCommitteeSelectionPositionConfig & { id: string })[];
  applicationForm: { formId: string; title: string; status: string } | null;
}
export interface CoreCommitteeSelectionCandidateRecord {
  id: string;
  selectionId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName: string;
  status:
    "APPLIED" | "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED" | "SHORTLISTED" | "WITHDRAWN";
  createdAt: Date;
  positions: { id: string; title: string }[];
}
