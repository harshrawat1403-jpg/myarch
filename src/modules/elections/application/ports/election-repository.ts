import type { ElectionConfig, ElectionStatus, PositionConfig } from "../../domain/election";
import type { CandidateRecord, ElectionRecord } from "../../domain/entities";
export interface ElectionRepository {
  list(includeDrafts: boolean): Promise<ElectionRecord[]>;
  get(id: string): Promise<ElectionRecord | null>;
  create(config: ElectionConfig, actorUserId: string): Promise<ElectionRecord>;
  update(id: string, config: ElectionConfig, actorUserId: string): Promise<ElectionRecord>;
  savePosition(
    id: string,
    positionId: string | null,
    config: PositionConfig,
    actorUserId: string,
  ): Promise<ElectionRecord>;
  deletePosition(id: string, positionId: string, actorUserId: string): Promise<ElectionRecord>;
  linkForm(id: string, formId: string, actorUserId: string): Promise<ElectionRecord>;
  transition(
    id: string,
    status: Exclude<ElectionStatus, "DRAFT" | "FINAL_CANDIDATES">,
    actorUserId: string,
  ): Promise<ElectionRecord>;
  candidates(id: string, applicantUserId?: string): Promise<CandidateRecord[]>;
  activeStudentUserIds(): Promise<string[]>;
  recordScrutiny(input: {
    electionId: string;
    candidateId: string;
    decision: "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED";
    reason: string;
    actorUserId: string;
  }): Promise<unknown>;
  requestCorrection(input: {
    electionId: string;
    candidateId: string;
    instructions: string;
    actorUserId: string;
  }): Promise<unknown>;
  submitCorrection(input: {
    electionId: string;
    candidateId: string;
    statement: string;
    evidenceReference?: string;
    actorUserId: string;
  }): Promise<unknown>;
  createObjection(input: {
    electionId: string;
    candidateId: string;
    reason: string;
    evidenceReference?: string;
    actorUserId: string;
  }): Promise<unknown>;
  resolveObjection(input: {
    electionId: string;
    candidateId: string;
    objectionId: string;
    status: "RESOLVED" | "DISMISSED";
    decisionReason: string;
    actorUserId: string;
  }): Promise<unknown>;
  shortlist(input: {
    electionId: string;
    candidateId: string;
    positionIds: string[];
    actorUserId: string;
  }): Promise<unknown>;
  withdraw(input: {
    electionId: string;
    candidateId: string;
    reason?: string;
    actorUserId: string;
  }): Promise<unknown>;
  saveCriterion(input: {
    electionId: string;
    criterionId?: string;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
    displayOrder: number;
    required: boolean;
    actorUserId: string;
  }): Promise<unknown>;
  createInterview(input: {
    electionId: string;
    candidateId: string;
    positionId: string;
    scheduledAt?: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    panelUserIds: string[];
    actorUserId: string;
  }): Promise<unknown>;
  completeInterview(input: {
    electionId: string;
    interviewId: string;
    candidateAttended: boolean;
    actorUserId: string;
  }): Promise<unknown>;
  submitScores(input: {
    electionId: string;
    interviewId: string;
    actorUserId: string;
    scores: { criterionId: string; score: number; comments?: string }[];
  }): Promise<unknown>;
  lockScores(input: {
    electionId: string;
    interviewId: string;
    actorUserId: string;
  }): Promise<unknown>;
  setPanelRecusal(input: {
    electionId: string;
    interviewId: string;
    panelMemberId: string;
    isRecused: boolean;
    actorUserId: string;
  }): Promise<unknown>;
  lockFinalCandidates(input: {
    electionId: string;
    entries: { candidateId: string; positionId: string }[];
    actorUserId: string;
  }): Promise<unknown>;
  saveVoterRosterEntry(input: {
    electionId: string;
    voterGroup: "FACULTY" | "EX_COUNCIL";
    userId: string;
    actorUserId: string;
  }): Promise<unknown>;
  removeVoterRosterEntry(input: {
    electionId: string;
    voterGroup: "FACULTY" | "EX_COUNCIL";
    entryId: string;
    actorUserId: string;
  }): Promise<unknown>;
  voterRoster(electionId: string): Promise<unknown>;
  lockVoterSnapshot(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  ballot(electionId: string, userId: string): Promise<unknown>;
  castBallot(input: {
    electionId: string;
    userId: string;
    choices: { positionId: string; candidateId?: string; isNota?: boolean }[];
  }): Promise<unknown>;
  abstain(input: { electionId: string; userId: string }): Promise<unknown>;
  turnout(electionId: string): Promise<unknown>;
  closeVoting(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  countResults(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  results(electionId: string): Promise<unknown>;
  assignVerifier(input: { electionId: string; verifierUserId: string; actorUserId: string }): Promise<unknown>;
  verificationWorkspace(input: { electionId: string; verifierUserId: string }): Promise<unknown>;
  verifyResult(input: {
    electionId: string;
    verifierUserId: string;
    outcome: "VERIFIED" | "FAILED_VERIFICATION";
    note?: string;
  }): Promise<unknown>;
  certifyResult(input: { electionId: string; actorUserId: string; note?: string }): Promise<unknown>;
  publishResult(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  publishedResults(electionId: string): Promise<unknown>;
  appointmentPreview(electionId: string): Promise<unknown>;
  confirmAppointments(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  archive(input: { electionId: string; actorUserId: string }): Promise<unknown>;
  processing(
    actorUserId: string | undefined,
    electionId: string,
    isSecretary: boolean,
  ): Promise<unknown>;
  panelAssignments(userId: string): Promise<unknown>;
}
