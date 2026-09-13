import type {
  CoreCommitteeSelectionConfig,
  CoreCommitteeSelectionPositionConfig,
  CoreCommitteeSelectionStatus,
} from "../../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionCandidateRecord,
  CoreCommitteeSelectionRecord,
  StudentCoreCommitteeSelectionDetail,
  StudentCoreCommitteeSelectionSummary,
} from "../../domain/entities";

export interface CoreCommitteeSelectionLifecycleNotificationRecipients {
  selectionId: string;
  selectionTitle: string;
  candidateUserIds: string[];
  selectedCandidateUserIds: string[];
  notSelectedCandidateUserIds: string[];
}

export interface CoreCommitteeSelectionPublicationResult {
  published: true;
  idempotent: boolean;
  notificationRecipients?: CoreCommitteeSelectionLifecycleNotificationRecipients;
}

export interface CoreCommitteeSelectionAppointmentResult {
  confirmed: true;
  idempotent: boolean;
  committeeId?: string;
  appointmentCount?: number;
  notificationRecipients?: {
    selectionId: string;
    selectionTitle: string;
    selectedCandidateUserIds: string[];
  };
}

export interface CoreCommitteeSelectionCouncilProcessingDTO {
  candidates: Array<{
    id: string;
    applicantUserId: string;
    candidateName: string;
    rollNumber: string | null;
    applicationId: string;
    submittedAt: Date;
    answers: unknown;
    applicationStatus: string;
    status: string;
    positions: Array<{ positionId: string; title: string }>;
    scrutiny: Array<{ decision: string; createdAt: Date }>;
    shortlist: Array<{ positionId: string; createdAt: Date }>;
    interviews: Array<{
      id: string;
      positionId: string;
      scheduledAt: Date | null;
      durationMinutes: number | null;
      mode: string | null;
      location: string | null;
      candidateAttended: boolean | null;
      completedAt: Date | null;
      status: string;
    }>;
    decisions: Array<{
      positionId: string;
      outcome: "SELECTED" | "NOT_SELECTED";
      state: "RECORDED" | "FINALIZED";
      decidedAt: Date;
      finalizedAt: Date | null;
    }>;
  }>;
  positions: Array<{ id: string; title: string; seats: number; displayOrder: number }>;
}

export interface CoreCommitteeSelectionRepository {
  list(includeDrafts: boolean): Promise<CoreCommitteeSelectionRecord[]>;
  get(id: string): Promise<CoreCommitteeSelectionRecord | null>;
  listForStudent(studentUserId: string): Promise<StudentCoreCommitteeSelectionSummary[]>;
  getForStudent(
    id: string,
    studentUserId: string,
  ): Promise<StudentCoreCommitteeSelectionDetail | null>;
  getStudentApplicationFormId(selectionId: string): Promise<string | null>;
  create(
    config: CoreCommitteeSelectionConfig,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  update(
    id: string,
    config: CoreCommitteeSelectionConfig,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  extendDeadline(input: {
    selectionId: string;
    newClosingDate: Date;
    actorUserId: string;
  }): Promise<CoreCommitteeSelectionRecord>;
  savePosition(
    selectionId: string,
    positionId: string | null,
    config: CoreCommitteeSelectionPositionConfig,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  linkForm(
    selectionId: string,
    formId: string,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  transition(
    selectionId: string,
    status: Exclude<CoreCommitteeSelectionStatus, "DRAFT">,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  candidates(
    selectionId: string,
    applicantUserId?: string,
  ): Promise<CoreCommitteeSelectionCandidateRecord[]>;
  recordScrutiny(input: {
    selectionId: string;
    candidateId: string;
    decision: "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED";
    reason: string;
    actorUserId: string;
  }): Promise<unknown>;
  requestCorrection(input: {
    selectionId: string;
    candidateId: string;
    instructions: string;
    actorUserId: string;
  }): Promise<unknown>;
  submitCorrection(input: {
    selectionId: string;
    candidateId: string;
    statement: string;
    actorUserId: string;
  }): Promise<unknown>;
  shortlist(input: {
    selectionId: string;
    candidateId: string;
    positionIds: string[];
    actorUserId: string;
  }): Promise<{ candidateId: string; candidateUserId: string; selectionTitle: string }>;
  createInterview(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    scheduledAt: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    candidateInstructions?: string;
    internalNotes?: string;
    actorUserId: string;
  }): Promise<{ interviewId: string; candidateUserId: string; selectionTitle: string }>;
  rescheduleInterview(input: {
    selectionId: string;
    interviewId: string;
    scheduledAt: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    candidateInstructions?: string;
    internalNotes?: string;
    actorUserId: string;
  }): Promise<{ interviewId: string; candidateUserId: string; selectionTitle: string }>;
  cancelInterview(input: {
    selectionId: string;
    interviewId: string;
    reason?: string;
    actorUserId: string;
  }): Promise<{ interviewId: string; candidateUserId: string; selectionTitle: string }>;
  completeInterview(input: {
    selectionId: string;
    interviewId: string;
    candidateAttended: boolean;
    actorUserId: string;
  }): Promise<unknown>;
  currentCouncilCommittee(selectionId: string, userId: string): Promise<string | null>;
  recordCouncilReview(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    councilCommitteeId: string;
    councilMemberUserId: string;
    note: string;
  }): Promise<unknown>;
  recordDecision(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    councilCommitteeId: string;
    councilMemberUserId: string;
    outcome: "SELECTED" | "NOT_SELECTED";
    internalNote: string;
  }): Promise<unknown>;
  finalizeDecision(input: {
    selectionId: string;
    decisionId: string;
    actorUserId: string;
  }): Promise<unknown>;
  internalProcessing(selectionId: string): Promise<unknown>;
  councilProcessing(selectionId: string): Promise<CoreCommitteeSelectionCouncilProcessingDTO>;
  publish(input: {
    selectionId: string;
    actorUserId: string;
  }): Promise<CoreCommitteeSelectionPublicationResult>;
  publishedResults(selectionId: string): Promise<unknown>;
  appointmentPreview(selectionId: string): Promise<unknown>;
  confirmAppointments(input: {
    selectionId: string;
    actorUserId: string;
  }): Promise<CoreCommitteeSelectionAppointmentResult>;
  archive(input: { selectionId: string; actorUserId: string }): Promise<unknown>;
  delete(input: {
    selectionId: string;
    actorUserId: string;
    confirmation: string | undefined;
  }): Promise<{ applications: number; shortlisted: number; interviews: number }>;
}
