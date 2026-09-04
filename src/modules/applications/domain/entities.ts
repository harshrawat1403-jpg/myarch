import type { FormFieldRecord } from "@/modules/forms";

export type FormApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "SELECTED" | "REJECTED";

export interface FormApplicationRecord {
  readonly id: string;
  readonly submissionId: string;
  readonly formId: string;
  readonly applicantUserId: string;
  readonly studentProfileId: string;
  readonly currentStatus: FormApplicationStatus;
  readonly decisionReason: string | null;
  readonly decidedByUserId: string | null;
  readonly decidedAt: Date | null;
  readonly submittedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FormApplicationReviewerRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly reviewerUserId: string;
  readonly assignedByUserId: string;
  readonly assignedAt: Date;
  readonly unassignedAt: Date | null;
}

export interface FormApplicationReviewRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly reviewerUserId: string;
  readonly notes: string;
  readonly createdAt: Date;
}

export interface FormApplicationStatusEventRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly fromStatus: FormApplicationStatus | null;
  readonly toStatus: FormApplicationStatus;
  readonly note: string | null;
  readonly changedByUserId: string;
  readonly occurredAt: Date;
}

export interface FormApplicationDetail extends FormApplicationRecord {
  readonly formTitle: string;
  readonly fields: readonly FormFieldRecord[];
  readonly answers: Record<string, unknown>;
  readonly applicantName: string;
  readonly applicantBatchId: string;
  readonly reviewers: readonly FormApplicationReviewerRecord[];
  readonly reviews: readonly FormApplicationReviewRecord[];
  readonly statusEvents: readonly FormApplicationStatusEventRecord[];
}

export interface FormApplicationSummary extends FormApplicationRecord {
  readonly formTitle: string;
  readonly applicantName: string;
  readonly applicantBatchId: string;
}

export interface StudentFormApplicationView extends FormApplicationRecord {
  readonly formTitle: string;
  readonly fields: readonly FormFieldRecord[];
  readonly answers: Record<string, unknown>;
  readonly statusEvents: readonly Pick<FormApplicationStatusEventRecord, "id" | "fromStatus" | "toStatus" | "occurredAt">[];
}

export interface ApplicationFilters {
  readonly formId?: string;
  readonly status?: FormApplicationStatus;
  readonly reviewerUserId?: string;
}

export const APPLICATION_REVIEW_NOTES_MAX_LENGTH = 5000;
export const APPLICATION_DECISION_REASON_MAX_LENGTH = 2000;
