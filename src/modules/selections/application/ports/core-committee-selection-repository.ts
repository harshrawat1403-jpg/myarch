import type {
  CoreCommitteeSelectionConfig,
  CoreCommitteeSelectionPositionConfig,
  CoreCommitteeSelectionStatus,
} from "../../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionCandidateRecord,
  CoreCommitteeSelectionRecord,
} from "../../domain/entities";
export interface CoreCommitteeSelectionRepository {
  list(includeDrafts: boolean): Promise<CoreCommitteeSelectionRecord[]>;
  get(id: string): Promise<CoreCommitteeSelectionRecord | null>;
  create(
    config: CoreCommitteeSelectionConfig,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
  update(
    id: string,
    config: CoreCommitteeSelectionConfig,
    actorUserId: string,
  ): Promise<CoreCommitteeSelectionRecord>;
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
  }): Promise<unknown>;
  createInterview(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    scheduledAt?: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    actorUserId: string;
  }): Promise<unknown>;
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
  processing(selectionId: string, applicantUserId?: string): Promise<unknown>;
}
