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

export interface StudentCoreCommitteeSelectionSummary {
  id: string;
  title: string;
  brief: string;
  status: CoreCommitteeSelectionStatus;
  applicationOpenAt: Date;
  applicationCloseAt: Date;
  application: {
    status: CoreCommitteeSelectionCandidateRecord["status"];
    submittedAt: Date;
    domain: { id: string; title: string };
  } | null;
}

export interface StudentCoreCommitteeSelectionDetail
  extends StudentCoreCommitteeSelectionSummary {
  positions: Array<{
    id: string;
    title: string;
    description: string;
    seats: number;
    displayOrder: number;
  }>;
  fields: readonly StudentCoreCommitteeApplicationField[];
  application: (StudentCoreCommitteeSelectionSummary["application"] & {
    answers: Record<string, unknown>;
  }) | null;
}

/** A form-field projection for students. The managed form ID stays server-side. */
export interface StudentCoreCommitteeApplicationField {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "LONG_TEXT" | "NUMBER" | "EMAIL" | "DROPDOWN" | "RADIO" | "CHECKBOX" | "DATE";
  description: string | null;
  required: boolean;
  options: readonly string[];
  validation: { min?: number; max?: number } | null;
  displayOrder: number;
}
