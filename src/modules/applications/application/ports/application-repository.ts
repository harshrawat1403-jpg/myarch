import type {
  ApplicationFilters,
  FormApplicationDetail,
  FormApplicationRecord,
  FormApplicationReviewRecord,
  FormApplicationReviewerRecord,
  FormApplicationStatus,
  FormApplicationStatusEventRecord,
  FormApplicationSummary,
} from "../../domain/entities";

export interface CreateFormApplicationData {
  readonly formId: string;
  readonly applicantUserId: string;
  readonly studentProfileId: string;
  readonly answers: Record<string, unknown>;
  readonly actorUserId: string;
  readonly electionPositionIds?: readonly string[];
}

export interface ApplicationRepository {
  createSubmitted(data: CreateFormApplicationData): Promise<FormApplicationRecord>;
  findById(id: string): Promise<FormApplicationDetail | null>;
  findByApplicantAndForm(applicantUserId: string, formId: string): Promise<FormApplicationRecord | null>;
  listForApplicant(applicantUserId: string): Promise<readonly FormApplicationSummary[]>;
  search(filters: ApplicationFilters): Promise<readonly FormApplicationSummary[]>;
  assignReviewer(applicationId: string, reviewerUserId: string, assignedByUserId: string): Promise<FormApplicationReviewerRecord>;
  findActiveReviewer(applicationId: string, reviewerUserId: string): Promise<FormApplicationReviewerRecord | null>;
  listReviewers(applicationId: string): Promise<readonly FormApplicationReviewerRecord[]>;
  recordReview(input: {
    applicationId: string;
    reviewerUserId: string;
    notes: string;
    fromStatus: Extract<FormApplicationStatus, "SUBMITTED" | "UNDER_REVIEW">;
    changedByUserId: string;
  }): Promise<{ application: FormApplicationRecord; review: FormApplicationReviewRecord }>;
  transitionStatus(input: {
    applicationId: string;
    fromStatus: FormApplicationStatus;
    toStatus: FormApplicationStatus;
    changedByUserId: string;
    note?: string | null;
    decisionReason?: string | null;
  }): Promise<FormApplicationRecord>;
  listStatusEvents(applicationId: string): Promise<readonly FormApplicationStatusEventRecord[]>;
}
