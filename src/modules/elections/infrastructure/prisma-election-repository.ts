import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { NotAuthorizedError } from "@/lib/errors";
import type { ElectionRepository } from "../application/ports/election-repository";
import {
  assertDraft,
  assertTransition,
  ElectionError,
  validateSchedule,
  validateWeights,
  type ElectionConfig,
  type PositionConfig,
} from "../domain/election";
import type { ElectionRecord } from "../domain/entities";

const include = {
  positions: { include: { weights: true }, orderBy: { displayOrder: "asc" as const } },
  applicationForm: { include: { form: true } },
};
type Row = Prisma.ElectionGetPayload<{ include: typeof include }>;
function record(row: Row): ElectionRecord {
  return {
    id: row.id,
    title: row.title,
    academicYear: row.academicYear,
    type: row.type,
    status: row.status,
    applicationOpenAt: row.applicationOpenAt,
    applicationCloseAt: row.applicationCloseAt,
    correctionOpenAt: row.correctionOpenAt,
    correctionCloseAt: row.correctionCloseAt,
    campaignEnabled: row.campaignEnabled,
    campaignOpenAt: row.campaignOpenAt,
    campaignCloseAt: row.campaignCloseAt,
    maxPositionsPerCandidate: row.maxPositionsPerCandidate,
    studentQuorumPercent: Number(row.studentQuorumPercent),
    facultyQuorumPercent: Number(row.facultyQuorumPercent),
    exCouncilQuorumPercent: Number(row.exCouncilQuorumPercent),
    configurationLockedAt: row.configurationLockedAt,
    createdAt: row.createdAt,
    positions: row.positions.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      seats: p.seats,
      displayOrder: p.displayOrder,
      weights: p.weights.map((w) => ({
        voterGroup: w.voterGroup,
        percentage: Number(w.percentage),
      })),
    })),
    applicationForm: row.applicationForm
      ? {
          formId: row.applicationForm.formId,
          title: row.applicationForm.form.title,
          status: row.applicationForm.form.status,
        }
      : null,
  };
}
export class PrismaElectionRepository implements ElectionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async list(includeDrafts: boolean) {
    return (
      await this.prisma.election.findMany({
        where: includeDrafts ? {} : { status: { not: "DRAFT" } },
        include,
        orderBy: { createdAt: "desc" },
      })
    ).map(record);
  }
  async get(id: string) {
    const row = await this.prisma.election.findUnique({ where: { id }, include });
    return row ? record(row) : null;
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    action: string,
    id: string,
  ) {
    await new PrismaAuditRecorder(tx).record({
      actorUserId,
      action,
      targetEntityType: "Election",
      targetEntityId: id,
    });
  }
  private async locked(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "elections" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const row = await tx.election.findUnique({ where: { id }, include });
    if (!row) throw new ElectionError("Election not found", "notFound");
    return row;
  }
  private async draft(tx: Prisma.TransactionClient, id: string) {
    const row = await this.locked(tx, id);
    assertDraft(row.status);
    if (await tx.electionCandidate.count({ where: { electionId: id } }))
      throw new ElectionError("Applications already exist; configuration cannot change");
    return row;
  }
  async create(config: ElectionConfig, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.election.create({
        data: { ...config, createdByUserId: actorUserId },
        include,
      });
      await this.audit(tx, actorUserId, AUDIT_ACTIONS.ELECTION_CREATED, row.id);
      return record(row);
    });
  }
  async update(id: string, config: ElectionConfig, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, id);
      const result = await tx.election.updateMany({ where: { id, status: "DRAFT" }, data: config });
      if (result.count !== 1) throw new ElectionError("Configuration is locked");
      await this.audit(tx, actorUserId, AUDIT_ACTIONS.ELECTION_UPDATED, id);
      return record(await this.locked(tx, id));
    });
  }
  async savePosition(
    id: string,
    positionId: string | null,
    config: PositionConfig,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, id);
      const { weights, ...fields } = config;
      const data = {
        ...fields,
        identityKey: fields.title.toLocaleLowerCase("en-US").replace(/\s+/g, " "),
      };
      if (positionId) {
        const result = await tx.electionPosition.updateMany({
          where: { id: positionId, electionId: id },
          data,
        });
        if (!result.count) throw new ElectionError("Position not found", "notFound");
        await tx.electionPositionWeight.deleteMany({ where: { positionId } });
        await tx.electionPositionWeight.createMany({
          data: weights.map((w) => ({ ...w, positionId })),
        });
      } else {
        await tx.electionPosition.create({
          data: { ...data, electionId: id, weights: { create: weights } },
        });
      }
      await this.audit(
        tx,
        actorUserId,
        positionId
          ? AUDIT_ACTIONS.ELECTION_POSITION_UPDATED
          : AUDIT_ACTIONS.ELECTION_POSITION_CREATED,
        id,
      );
      return record(await this.locked(tx, id));
    });
  }
  async deletePosition(id: string, positionId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, id);
      const result = await tx.electionPosition.deleteMany({
        where: { id: positionId, electionId: id },
      });
      if (!result.count) throw new ElectionError("Position not found", "notFound");
      await this.audit(tx, actorUserId, AUDIT_ACTIONS.ELECTION_POSITION_DELETED, id);
      return record(await this.locked(tx, id));
    });
  }
  async linkForm(id: string, formId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Global lock order: form before election, also used by submission/opening.
      await tx.$queryRaw`SELECT "id" FROM "forms" WHERE "id" = ${formId}::uuid FOR UPDATE`;
      await this.draft(tx, id);
      const form = await tx.form.findUnique({
        where: { id: formId },
        include: { _count: { select: { submissions: true } } },
      });
      if (!form || !["DRAFT", "PUBLISHED"].includes(form.status))
        throw new ElectionError("Link a draft or published form", "validation");
      if (form._count.submissions)
        throw new ElectionError(
          "Use a form without existing submissions; this protects existing application semantics",
        );
      await tx.electionApplicationForm.upsert({
        where: { electionId: id },
        create: { electionId: id, formId },
        update: { formId },
      });
      await this.audit(tx, actorUserId, AUDIT_ACTIONS.ELECTION_APPLICATION_FORM_LINKED, id);
      return record(await this.locked(tx, id));
    });
  }
  async transition(
    id: string,
    status: Exclude<import("../domain/election").ElectionStatus, "DRAFT" | "FINAL_CANDIDATES">,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.electionApplicationForm.findUnique({ where: { electionId: id } });
      if (link)
        await tx.$queryRaw`SELECT "id" FROM "forms" WHERE "id" = ${link.formId}::uuid FOR UPDATE`;
      const row = await this.locked(tx, id);
      assertTransition(row.status, status);
      const now = new Date();
      if (status === "SHORTLIST") {
        const unresolved =
          (await tx.electionCorrectionRequest.count({
            where: { electionId: id, status: { in: ["OPEN", "SUBMITTED"] } },
          })) +
          (await tx.electionObjection.count({ where: { electionId: id, status: "OPEN" } }));
        if (unresolved) throw new ElectionError("Resolve all corrections and objections before shortlisting");
      }
      if (status === "INTERVIEWS" && !(await tx.electionInterviewCriterion.count({ where: { electionId: id } })))
        throw new ElectionError("Configure interview criteria before starting interviews");
      if (status === "APPLICATION_CLOSED" && now < row.applicationCloseAt)
        throw new ElectionError(
          "Applications cannot close before the configured deadline; emergency overrides are not available in Slice 1",
        );
      if (status === "APPLICATION_OPEN") {
        if (!row.applicationForm || row.applicationForm.formId !== link?.formId)
          throw new ElectionError("Application form changed; retry opening");
        const form = row.applicationForm.form;
        if (
          form.status !== "PUBLISHED" ||
          (form.deadline && form.deadline < row.applicationCloseAt)
        )
          throw new ElectionError(
            "Publish the form with no deadline or a deadline covering the election application window",
            "validation",
          );
        validateSchedule(record(row));
        if (now < row.applicationOpenAt || now >= row.applicationCloseAt)
          throw new ElectionError("Applications can only open within the configured window");
        if (!row.positions.length || row.maxPositionsPerCandidate > row.positions.length)
          throw new ElectionError("Configure positions and a valid position limit", "validation");
        for (const position of record(row).positions)
          validateWeights(position.weights, row.type === "COUNCIL");
        await this.audit(tx, actorUserId, AUDIT_ACTIONS.ELECTION_CONFIGURATION_LOCKED, id);
      }
      const result = await tx.election.updateMany({
        where: { id, status: row.status },
        data:
          status === "APPLICATION_OPEN"
            ? {
                status,
                openedAt: now,
                configurationLockedAt: now,
                configurationLockedByUserId: actorUserId,
              }
            : status === "APPLICATION_CLOSED"
              ? { status, closedAt: now }
              : { status },
      });
      if (result.count !== 1) throw new ElectionError("Election state changed; refresh and retry");
      await this.audit(
        tx,
        actorUserId,
        status === "APPLICATION_OPEN"
          ? AUDIT_ACTIONS.ELECTION_APPLICATION_OPENED
          : AUDIT_ACTIONS.ELECTION_APPLICATION_CLOSED,
        id,
      );
      return record(await this.locked(tx, id));
    });
  }
  async candidates(id: string, applicantUserId?: string) {
    const rows = await this.prisma.electionCandidate.findMany({
      where: { electionId: id, applicantUserId },
      include: {
        application: { include: { submission: { include: { studentProfile: true } } } },
        positions: { include: { position: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      electionId: row.electionId,
      applicationId: row.applicationId,
      applicantUserId: row.applicantUserId,
      applicantName: row.application.submission.studentProfile.fullName,
      status: row.status,
      createdAt: row.createdAt,
      positions: row.positions.map((p) => ({ id: p.positionId, title: p.position.title })),
    }));
  }
  async activeStudentUserIds() {
    return (
      await this.prisma.user.findMany({
        where: { role: "STUDENT", isActive: true, studentProfile: { isActive: true } },
        select: { id: true },
      })
    ).map((u) => u.id);
  }

  private async processingCandidate(tx: Prisma.TransactionClient, electionId: string, candidateId: string) {
    await tx.$queryRaw`SELECT "id" FROM "election_candidates" WHERE "id" = ${candidateId}::uuid FOR UPDATE`;
    const candidate = await tx.electionCandidate.findFirst({
      where: { id: candidateId, electionId },
      include: { positions: true },
    });
    if (!candidate) throw new ElectionError("Candidate not found", "notFound");
    return candidate;
  }
  private async processingElection(tx: Prisma.TransactionClient, electionId: string, allowed: string[]) {
    const election = await this.locked(tx, electionId);
    if (!allowed.includes(election.status))
      throw new ElectionError("This action is not available in the current election stage");
    return election;
  }
  private async auditCandidate(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    action: string,
    candidateId: string,
    electionId: string,
  ) {
    await new PrismaAuditRecorder(tx).record({
      actorUserId,
      action,
      targetEntityType: "ElectionCandidate",
      targetEntityId: candidateId,
      metadata: { electionId },
    });
  }
  async recordScrutiny(input: {
    electionId: string;
    candidateId: string;
    decision: "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED";
    reason: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SCRUTINY", "CORRECTIONS_OBJECTIONS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status === "WITHDRAWN" || candidate.status === "FINAL_CANDIDATE")
        throw new ElectionError("This candidate can no longer be reviewed");
      const review = await tx.electionScrutinyReview.create({
        data: {
          electionId: input.electionId,
          candidateId: input.candidateId,
          decision: input.decision,
          reason: input.reason,
          reviewerUserId: input.actorUserId,
        },
      });
      const next = input.decision;
      await tx.electionCandidate.update({ where: { id: candidate.id }, data: { status: next } });
      if (input.decision !== "CORRECTION_REQUIRED")
        await tx.electionCorrectionRequest.updateMany({
          where: { candidateId: candidate.id, status: { in: ["OPEN", "SUBMITTED"] } },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_SCRUTINY_RECORDED, candidate.id, input.electionId);
      return review;
    });
  }
  async requestCorrection(input: {
    electionId: string;
    candidateId: string;
    instructions: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.processingElection(tx, input.electionId, ["CORRECTIONS_OBJECTIONS"]);
      const now = new Date();
      if (!election.correctionOpenAt || !election.correctionCloseAt || now < election.correctionOpenAt || now >= election.correctionCloseAt)
        throw new ElectionError("Corrections are not currently open", "validation");
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "CORRECTION_REQUIRED")
        throw new ElectionError("A correction can only be requested after a correction-required scrutiny decision");
      if (await tx.electionCorrectionRequest.count({ where: { candidateId: candidate.id, status: { in: ["OPEN", "SUBMITTED"] } } }))
        throw new ElectionError("This candidate already has an active correction request");
      const request = await tx.electionCorrectionRequest.create({
        data: { electionId: input.electionId, candidateId: candidate.id, instructions: input.instructions, requestedByUserId: input.actorUserId },
      });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_CORRECTION_REQUESTED, candidate.id, input.electionId);
      return request;
    });
  }
  async submitCorrection(input: {
    electionId: string;
    candidateId: string;
    statement: string;
    evidenceReference?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.processingElection(tx, input.electionId, ["CORRECTIONS_OBJECTIONS"]);
      const now = new Date();
      if (!election.correctionOpenAt || !election.correctionCloseAt || now < election.correctionOpenAt || now >= election.correctionCloseAt)
        throw new ElectionError("Corrections are not currently open", "validation");
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.applicantUserId !== input.actorUserId) throw new NotAuthorizedError("Only the candidate may submit this correction");
      const request = await tx.electionCorrectionRequest.findFirst({ where: { candidateId: candidate.id, status: "OPEN" } });
      if (!request) throw new ElectionError("No open correction request exists");
      const submission = await tx.electionCorrectionSubmission.create({
        data: { correctionRequestId: request.id, submittedByUserId: input.actorUserId, statement: input.statement, evidenceReference: input.evidenceReference },
      });
      await tx.electionCorrectionRequest.updateMany({ where: { id: request.id, status: "OPEN" }, data: { status: "SUBMITTED" } });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_CORRECTION_SUBMITTED, candidate.id, input.electionId);
      return submission;
    });
  }
  async createObjection(input: {
    electionId: string;
    candidateId: string;
    reason: string;
    evidenceReference?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["CORRECTIONS_OBJECTIONS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.applicantUserId !== input.actorUserId) throw new NotAuthorizedError("Only a candidate may appeal their own scrutiny outcome");
      if (candidate.status === "FINAL_CANDIDATE" || candidate.status === "WITHDRAWN") throw new ElectionError("This candidacy cannot be appealed");
      const objection = await tx.electionObjection.create({
        data: { electionId: input.electionId, candidateId: candidate.id, objectorUserId: input.actorUserId, reason: input.reason, evidenceReference: input.evidenceReference },
      });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_OBJECTION_RECORDED, candidate.id, input.electionId);
      return objection;
    });
  }
  async resolveObjection(input: {
    electionId: string;
    candidateId: string;
    objectionId: string;
    status: "RESOLVED" | "DISMISSED";
    decisionReason: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["CORRECTIONS_OBJECTIONS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      const result = await tx.electionObjection.updateMany({
        where: { id: input.objectionId, electionId: input.electionId, candidateId: candidate.id, status: "OPEN" },
        data: { status: input.status, decisionReason: input.decisionReason, reviewedByUserId: input.actorUserId, resolvedAt: new Date() },
      });
      if (result.count !== 1) throw new ElectionError("Objection is already resolved or not found");
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_OBJECTION_RESOLVED, candidate.id, input.electionId);
      return { id: input.objectionId, status: input.status };
    });
  }
  async shortlist(input: { electionId: string; candidateId: string; positionIds: string[]; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SHORTLIST"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "ELIGIBLE") throw new ElectionError("Only eligible candidates may be shortlisted");
      if (new Set(input.positionIds).size !== input.positionIds.length || input.positionIds.some((id) => !candidate.positions.some((p) => p.positionId === id)))
        throw new ElectionError("Select only this candidate's distinct election positions", "validation");
      await tx.electionShortlistEntry.createMany({ data: input.positionIds.map((positionId) => ({ electionId: input.electionId, candidateId: candidate.id, positionId, shortlistedByUserId: input.actorUserId })) });
      await tx.electionCandidate.update({ where: { id: candidate.id }, data: { status: "SHORTLISTED" } });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_CANDIDATE_SHORTLISTED, candidate.id, input.electionId);
      return { candidateId: candidate.id, positionIds: input.positionIds };
    });
  }
  async withdraw(input: { electionId: string; candidateId: string; reason?: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SCRUTINY", "CORRECTIONS_OBJECTIONS", "SHORTLIST", "INTERVIEWS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.applicantUserId !== input.actorUserId) throw new NotAuthorizedError("Only the candidate may withdraw");
      if (candidate.status === "WITHDRAWN" || candidate.status === "FINAL_CANDIDATE") throw new ElectionError("This candidacy can no longer be withdrawn");
      await tx.electionCandidate.update({ where: { id: candidate.id }, data: { status: "WITHDRAWN" } });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_CANDIDATE_WITHDRAWN, candidate.id, input.electionId);
      return { candidateId: candidate.id, status: "WITHDRAWN", reason: input.reason };
    });
  }
  async saveCriterion(input: {
    electionId: string; criterionId?: string; name: string; description: string; maxScore: number; weight: number; displayOrder: number; required: boolean; actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SHORTLIST", "INTERVIEWS"]);
      if (await tx.electionInterviewScore.count({ where: { criterion: { electionId: input.electionId } } }))
        throw new ElectionError("Interview criteria are locked once scoring begins");
      const data = { electionId: input.electionId, name: input.name, description: input.description, maxScore: input.maxScore, weight: input.weight, displayOrder: input.displayOrder, required: input.required };
      if (!input.criterionId) return tx.electionInterviewCriterion.create({ data });
      const result = await tx.electionInterviewCriterion.updateMany({
        where: { id: input.criterionId, electionId: input.electionId },
        data,
      });
      if (result.count !== 1) throw new ElectionError("Interview criterion not found", "notFound");
      return tx.electionInterviewCriterion.findUniqueOrThrow({ where: { id: input.criterionId } });
    });
  }
  async createInterview(input: {
    electionId: string; candidateId: string; positionId: string; scheduledAt?: Date; durationMinutes?: number; mode?: string; location?: string; panelUserIds: string[]; actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "SHORTLISTED") throw new ElectionError("Only shortlisted candidates may be interviewed");
      const shortlist = await tx.electionShortlistEntry.findFirst({ where: { electionId: input.electionId, candidateId: candidate.id, positionId: input.positionId } });
      if (!shortlist) throw new ElectionError("Candidate is not shortlisted for this position");
      if (new Set(input.panelUserIds).size !== input.panelUserIds.length) throw new ElectionError("Panel members must be distinct", "validation");
      const users = await tx.user.findMany({ where: { id: { in: input.panelUserIds }, isActive: true }, select: { id: true } });
      if (users.length !== input.panelUserIds.length) throw new ElectionError("Panel members must be active authenticated users", "validation");
      if (input.scheduledAt && input.durationMinutes) {
        const existing = await tx.electionInterviewPanelMember.findMany({
          where: { userId: { in: input.panelUserIds }, interview: { status: "SCHEDULED", scheduledAt: { not: null } } },
          include: { interview: { select: { scheduledAt: true, durationMinutes: true } } },
        });
        const start = input.scheduledAt.getTime(), end = start + input.durationMinutes * 60000;
        if (existing.some((row) => { const at = row.interview.scheduledAt!.getTime(); const until = at + (row.interview.durationMinutes ?? 0) * 60000; return start < until && at < end; }))
          throw new ElectionError("A panel member already has an overlapping interview");
      }
      const interview = await tx.electionInterview.create({
        data: { electionId: input.electionId, candidateId: candidate.id, positionId: input.positionId, status: input.scheduledAt ? "SCHEDULED" : "PLANNED", scheduledAt: input.scheduledAt, durationMinutes: input.durationMinutes, mode: input.mode, location: input.location, scheduledByUserId: input.actorUserId, panelMembers: { create: input.panelUserIds.map((userId) => ({ userId })) } },
        include: { panelMembers: true },
      });
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_INTERVIEW_SCHEDULED, candidate.id, input.electionId);
      return interview;
    });
  }
  async completeInterview(input: { electionId: string; interviewId: string; candidateAttended: boolean; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({ where: { id: input.interviewId, electionId: input.electionId }, include: { candidate: true } });
      if (!interview) throw new ElectionError("Interview not found", "notFound");
      if (interview.status !== "SCHEDULED" || interview.candidate.status === "WITHDRAWN") throw new ElectionError("This interview cannot be completed");
      const result = await tx.electionInterview.updateMany({ where: { id: interview.id, status: "SCHEDULED" }, data: { status: "COMPLETED", candidateAttended: input.candidateAttended, completedAt: new Date() } });
      if (result.count !== 1) throw new ElectionError("Interview changed; refresh and retry");
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_INTERVIEW_COMPLETED, interview.candidateId, input.electionId);
      return { id: interview.id, status: "COMPLETED" };
    });
  }
  async submitScores(input: { electionId: string; interviewId: string; actorUserId: string; scores: { criterionId: string; score: number; comments?: string }[] }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({ where: { id: input.interviewId, electionId: input.electionId }, include: { candidate: true, panelMembers: { where: { userId: input.actorUserId } } } });
      if (!interview) throw new ElectionError("Interview not found", "notFound");
      const member = interview.panelMembers[0];
      if (!member || member.isRecused) throw new NotAuthorizedError("Only an assigned, non-recused panel member may score");
      if (interview.status !== "COMPLETED" || interview.scoresLockedAt || interview.candidate.status === "WITHDRAWN") throw new ElectionError("Scores are not open for this interview");
      if (new Set(input.scores.map((score) => score.criterionId)).size !== input.scores.length) throw new ElectionError("Each criterion may be scored once", "validation");
      const criteria = await tx.electionInterviewCriterion.findMany({ where: { electionId: input.electionId, id: { in: input.scores.map((score) => score.criterionId) } } });
      if (criteria.length !== input.scores.length || input.scores.some((score) => score.score > Number(criteria.find((criterion) => criterion.id === score.criterionId)!.maxScore))) throw new ElectionError("Score must be within the configured criterion range", "validation");
      await Promise.all(input.scores.map((score) => tx.electionInterviewScore.upsert({ where: { interviewId_panelMemberId_criterionId: { interviewId: interview.id, panelMemberId: member.id, criterionId: score.criterionId } }, create: { interviewId: interview.id, panelMemberId: member.id, criterionId: score.criterionId, score: score.score, comments: score.comments }, update: { score: score.score, comments: score.comments } })));
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_INTERVIEW_SCORE_SUBMITTED, interview.candidateId, input.electionId);
      return { interviewId: interview.id };
    });
  }
  async lockScores(input: { electionId: string; interviewId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({ where: { id: input.interviewId, electionId: input.electionId }, include: { panelMembers: { include: { scores: true } }, candidate: true } });
      if (!interview || interview.status !== "COMPLETED") throw new ElectionError("Only a completed interview may be locked");
      const criteria = await tx.electionInterviewCriterion.findMany({ where: { electionId: input.electionId, required: true } });
      if (!criteria.length) throw new ElectionError("Configure at least one required interview criterion");
      if (interview.panelMembers.filter((member) => !member.isRecused).some((member) => criteria.some((criterion) => !member.scores.some((score) => score.criterionId === criterion.id))))
        throw new ElectionError("All non-recused panel members must submit required scores");
      const result = await tx.electionInterview.updateMany({ where: { id: interview.id, scoresLockedAt: null }, data: { scoresLockedAt: new Date() } });
      if (result.count !== 1) throw new ElectionError("Scores are already locked");
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_INTERVIEW_SCORE_LOCKED, interview.candidateId, input.electionId);
      return { interviewId: interview.id, locked: true };
    });
  }
  async setPanelRecusal(input: { electionId: string; interviewId: string; panelMemberId: string; isRecused: boolean; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({ where: { id: input.interviewId, electionId: input.electionId } });
      if (!interview || interview.scoresLockedAt) throw new ElectionError("Panel membership is locked for this interview");
      const result = await tx.electionInterviewPanelMember.updateMany({ where: { id: input.panelMemberId, interviewId: interview.id }, data: { isRecused: input.isRecused, conflictDeclaredAt: input.isRecused ? new Date() : null } });
      if (result.count !== 1) throw new ElectionError("Panel member not found", "notFound");
      await this.auditCandidate(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_PANEL_MEMBER_RECUSED, interview.candidateId, input.electionId);
      return { id: input.panelMemberId, isRecused: input.isRecused };
    });
  }
  async lockFinalCandidates(input: { electionId: string; entries: { candidateId: string; positionId: string }[]; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      if (new Set(input.entries.map((entry) => `${entry.candidateId}:${entry.positionId}`)).size !== input.entries.length) throw new ElectionError("Final candidate entries must be distinct", "validation");
      for (const entry of input.entries) {
        const candidate = await this.processingCandidate(tx, input.electionId, entry.candidateId);
        const shortlisted = await tx.electionShortlistEntry.findFirst({ where: { electionId: input.electionId, candidateId: candidate.id, positionId: entry.positionId } });
        const interview = await tx.electionInterview.findFirst({ where: { electionId: input.electionId, candidateId: candidate.id, positionId: entry.positionId } });
        const unresolved = await tx.electionObjection.count({ where: { candidateId: candidate.id, status: "OPEN" } }) + await tx.electionCorrectionRequest.count({ where: { candidateId: candidate.id, status: { in: ["OPEN", "SUBMITTED"] } } });
        if (!shortlisted || !interview || interview.status !== "COMPLETED" || !interview.scoresLockedAt || unresolved || candidate.status === "WITHDRAWN" || candidate.status === "INELIGIBLE")
          throw new ElectionError("Every final candidate must be eligible, shortlisted, fully evaluated, and free of unresolved processing");
      }
      await tx.electionFinalCandidate.createMany({ data: input.entries.map((entry) => ({ electionId: input.electionId, candidateId: entry.candidateId, positionId: entry.positionId, lockedByUserId: input.actorUserId })) });
      await tx.electionCandidate.updateMany({ where: { id: { in: input.entries.map((entry) => entry.candidateId) } }, data: { status: "FINAL_CANDIDATE" } });
      const result = await tx.election.updateMany({ where: { id: input.electionId, status: "INTERVIEWS" }, data: { status: "FINAL_CANDIDATES" } });
      if (result.count !== 1) throw new ElectionError("Election state changed; refresh and retry");
      await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_FINAL_CANDIDATES_LOCKED, input.electionId);
      return { entries: input.entries, status: "FINAL_CANDIDATES" };
    });
  }
  async processing(actorUserId: string | undefined, electionId: string, isSecretary: boolean) {
    const candidates = await this.prisma.electionCandidate.findMany({
      where: { electionId, ...(isSecretary ? {} : { applicantUserId: actorUserId }) },
      include: {
        positions: { include: { position: true } },
        scrutinyReviews: { orderBy: { createdAt: "desc" } },
        correctionRequests: { include: { submissions: true }, orderBy: { createdAt: "desc" } },
        objections: { orderBy: { createdAt: "desc" } },
        shortlistEntries: true,
        interviews: { include: { panelMembers: isSecretary ? { include: { user: { select: { id: true, email: true } } } } : { where: { userId: actorUserId } } } },
        finalCandidates: true,
      },
    });
    const criteria = await this.prisma.electionInterviewCriterion.findMany({ where: { electionId }, orderBy: { displayOrder: "asc" } });
    const assignedInterviews = isSecretary || !actorUserId ? [] : await this.prisma.electionInterview.findMany({
      where: { electionId, panelMembers: { some: { userId: actorUserId } } },
      include: { candidate: { include: { applicant: { select: { id: true, email: true }, }, positions: { include: { position: true } } } }, position: true, panelMembers: { where: { userId: actorUserId }, include: { scores: true } }, scores: { where: { panelMember: { userId: actorUserId } } } },
      orderBy: { scheduledAt: "asc" },
    });
    return { candidates, criteria, assignedInterviews };
  }
  async panelAssignments(userId: string) {
    return this.prisma.electionInterview.findMany({
      where: { panelMembers: { some: { userId } } },
      include: {
        election: { select: { id: true, title: true, status: true } },
        candidate: { include: { applicant: { select: { email: true, studentProfile: { select: { fullName: true } } } } } },
        position: { select: { title: true } },
        panelMembers: { where: { userId }, include: { scores: true } },
        scores: { where: { panelMember: { userId } } },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }
}
