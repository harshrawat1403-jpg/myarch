import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { NotAuthorizedError } from "@/lib/errors";
import type { ElectionRepository } from "../application/ports/election-repository";
import {
  assertCouncilSingleSeat,
  assertDraft,
  assertTransition,
  assertVotingSchedule,
  ElectionError,
  validateSchedule,
  validateWeights,
  type ElectionConfig,
  type PositionConfig,
} from "../domain/election";
import type { ElectionRecord } from "../domain/entities";
import { computePositionResult, type ResultVoterGroup } from "../domain/results";

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
    votingOpenAt: row.votingOpenAt,
    votingCloseAt: row.votingCloseAt,
    notaEnabled: row.notaEnabled,
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
    metadata?: Record<string, unknown>,
  ) {
    await new PrismaAuditRecorder(tx).record({
      actorUserId,
      action,
      targetEntityType: "Election",
      targetEntityId: id,
      metadata,
    });
  }
  private async locked(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "elections" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const row = await tx.election.findUnique({ where: { id }, include });
    if (!row) throw new ElectionError("Election not found", "notFound");
    if (row.type !== "COUNCIL")
      throw new ElectionError(
        "Core Committee selections are managed outside the election workflow",
      );
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
      const election = await this.draft(tx, id);
      if (election.type === "COUNCIL" && config.seats !== 1)
        throw new ElectionError("Council election positions must have exactly one seat", "validation");
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
        include: {
          _count: { select: { submissions: true } },
          coreCommitteeSelectionApplicationForm: true,
        },
      });
      if (!form || !["DRAFT", "PUBLISHED"].includes(form.status))
        throw new ElectionError("Link a draft or published form", "validation");
      if (form._count.submissions)
        throw new ElectionError(
          "Use a form without existing submissions; this protects existing application semantics",
        );
      if (form.coreCommitteeSelectionApplicationForm)
        throw new ElectionError("Form is already associated with a Core Committee selection");
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
          })) + (await tx.electionObjection.count({ where: { electionId: id, status: "OPEN" } }));
        if (unresolved)
          throw new ElectionError("Resolve all corrections and objections before shortlisting");
      }
      if (
        status === "INTERVIEWS" &&
        !(await tx.electionInterviewCriterion.count({ where: { electionId: id } }))
      )
        throw new ElectionError("Configure interview criteria before starting interviews");
      if (status === "VOTING") {
        assertCouncilSingleSeat(record(row).positions);
        assertVotingSchedule(record(row));
        if (!row.voterSnapshotLockedAt || !row.voterSnapshotLockedByUserId)
          throw new ElectionError("Lock the Council voter snapshot before opening voting");
        if (now < row.votingOpenAt! || now >= row.votingCloseAt!)
          throw new ElectionError("Voting can only open within the configured window");
        const finalCandidatePositionIds = new Set(
          (
            await tx.electionFinalCandidate.findMany({
              where: { electionId: id },
              select: { positionId: true },
            })
          ).map((entry) => entry.positionId),
        );
        if (
          !row.positions.length ||
          row.positions.some((position) => !finalCandidatePositionIds.has(position.id))
        )
          throw new ElectionError("Lock at least one final candidate for every election position");
      }
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
        validateSchedule({ ...record(row), type: "COUNCIL" });
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
          : status === "APPLICATION_CLOSED"
            ? AUDIT_ACTIONS.ELECTION_APPLICATION_CLOSED
            : AUDIT_ACTIONS.ELECTION_VOTING_OPENED,
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

  private async processingCandidate(
    tx: Prisma.TransactionClient,
    electionId: string,
    candidateId: string,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "election_candidates" WHERE "id" = ${candidateId}::uuid FOR UPDATE`;
    const candidate = await tx.electionCandidate.findFirst({
      where: { id: candidateId, electionId },
      include: { positions: true },
    });
    if (!candidate) throw new ElectionError("Candidate not found", "notFound");
    return candidate;
  }
  private async processingElection(
    tx: Prisma.TransactionClient,
    electionId: string,
    allowed: string[],
  ) {
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
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_SCRUTINY_RECORDED,
        candidate.id,
        input.electionId,
      );
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
      const election = await this.processingElection(tx, input.electionId, [
        "CORRECTIONS_OBJECTIONS",
      ]);
      const now = new Date();
      if (
        !election.correctionOpenAt ||
        !election.correctionCloseAt ||
        now < election.correctionOpenAt ||
        now >= election.correctionCloseAt
      )
        throw new ElectionError("Corrections are not currently open", "validation");
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "CORRECTION_REQUIRED")
        throw new ElectionError(
          "A correction can only be requested after a correction-required scrutiny decision",
        );
      if (
        await tx.electionCorrectionRequest.count({
          where: { candidateId: candidate.id, status: { in: ["OPEN", "SUBMITTED"] } },
        })
      )
        throw new ElectionError("This candidate already has an active correction request");
      const request = await tx.electionCorrectionRequest.create({
        data: {
          electionId: input.electionId,
          candidateId: candidate.id,
          instructions: input.instructions,
          requestedByUserId: input.actorUserId,
        },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_CORRECTION_REQUESTED,
        candidate.id,
        input.electionId,
      );
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
      const election = await this.processingElection(tx, input.electionId, [
        "CORRECTIONS_OBJECTIONS",
      ]);
      const now = new Date();
      if (
        !election.correctionOpenAt ||
        !election.correctionCloseAt ||
        now < election.correctionOpenAt ||
        now >= election.correctionCloseAt
      )
        throw new ElectionError("Corrections are not currently open", "validation");
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.applicantUserId !== input.actorUserId)
        throw new NotAuthorizedError("Only the candidate may submit this correction");
      const request = await tx.electionCorrectionRequest.findFirst({
        where: { candidateId: candidate.id, status: "OPEN" },
      });
      if (!request) throw new ElectionError("No open correction request exists");
      const submission = await tx.electionCorrectionSubmission.create({
        data: {
          correctionRequestId: request.id,
          submittedByUserId: input.actorUserId,
          statement: input.statement,
          evidenceReference: input.evidenceReference,
        },
      });
      await tx.electionCorrectionRequest.updateMany({
        where: { id: request.id, status: "OPEN" },
        data: { status: "SUBMITTED" },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_CORRECTION_SUBMITTED,
        candidate.id,
        input.electionId,
      );
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
      if (candidate.applicantUserId !== input.actorUserId)
        throw new NotAuthorizedError("Only a candidate may appeal their own scrutiny outcome");
      if (candidate.status === "FINAL_CANDIDATE" || candidate.status === "WITHDRAWN")
        throw new ElectionError("This candidacy cannot be appealed");
      const objection = await tx.electionObjection.create({
        data: {
          electionId: input.electionId,
          candidateId: candidate.id,
          objectorUserId: input.actorUserId,
          reason: input.reason,
          evidenceReference: input.evidenceReference,
        },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_OBJECTION_RECORDED,
        candidate.id,
        input.electionId,
      );
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
        where: {
          id: input.objectionId,
          electionId: input.electionId,
          candidateId: candidate.id,
          status: "OPEN",
        },
        data: {
          status: input.status,
          decisionReason: input.decisionReason,
          reviewedByUserId: input.actorUserId,
          resolvedAt: new Date(),
        },
      });
      if (result.count !== 1) throw new ElectionError("Objection is already resolved or not found");
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_OBJECTION_RESOLVED,
        candidate.id,
        input.electionId,
      );
      return { id: input.objectionId, status: input.status };
    });
  }
  async shortlist(input: {
    electionId: string;
    candidateId: string;
    positionIds: string[];
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SHORTLIST"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "ELIGIBLE")
        throw new ElectionError("Only eligible candidates may be shortlisted");
      if (
        new Set(input.positionIds).size !== input.positionIds.length ||
        input.positionIds.some((id) => !candidate.positions.some((p) => p.positionId === id))
      )
        throw new ElectionError(
          "Select only this candidate's distinct election positions",
          "validation",
        );
      await tx.electionShortlistEntry.createMany({
        data: input.positionIds.map((positionId) => ({
          electionId: input.electionId,
          candidateId: candidate.id,
          positionId,
          shortlistedByUserId: input.actorUserId,
        })),
      });
      await tx.electionCandidate.update({
        where: { id: candidate.id },
        data: { status: "SHORTLISTED" },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_CANDIDATE_SHORTLISTED,
        candidate.id,
        input.electionId,
      );
      return { candidateId: candidate.id, positionIds: input.positionIds };
    });
  }
  async withdraw(input: {
    electionId: string;
    candidateId: string;
    reason?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, [
        "SCRUTINY",
        "CORRECTIONS_OBJECTIONS",
        "SHORTLIST",
        "INTERVIEWS",
      ]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.applicantUserId !== input.actorUserId)
        throw new NotAuthorizedError("Only the candidate may withdraw");
      if (candidate.status === "WITHDRAWN" || candidate.status === "FINAL_CANDIDATE")
        throw new ElectionError("This candidacy can no longer be withdrawn");
      await tx.electionCandidate.update({
        where: { id: candidate.id },
        data: { status: "WITHDRAWN" },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_CANDIDATE_WITHDRAWN,
        candidate.id,
        input.electionId,
      );
      return { candidateId: candidate.id, status: "WITHDRAWN", reason: input.reason };
    });
  }
  async saveCriterion(input: {
    electionId: string;
    criterionId?: string;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
    displayOrder: number;
    required: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["SHORTLIST", "INTERVIEWS"]);
      if (
        await tx.electionInterviewScore.count({
          where: { criterion: { electionId: input.electionId } },
        })
      )
        throw new ElectionError("Interview criteria are locked once scoring begins");
      const data = {
        electionId: input.electionId,
        name: input.name,
        description: input.description,
        maxScore: input.maxScore,
        weight: input.weight,
        displayOrder: input.displayOrder,
        required: input.required,
      };
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
    electionId: string;
    candidateId: string;
    positionId: string;
    scheduledAt?: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    panelUserIds: string[];
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const candidate = await this.processingCandidate(tx, input.electionId, input.candidateId);
      if (candidate.status !== "SHORTLISTED")
        throw new ElectionError("Only shortlisted candidates may be interviewed");
      const shortlist = await tx.electionShortlistEntry.findFirst({
        where: {
          electionId: input.electionId,
          candidateId: candidate.id,
          positionId: input.positionId,
        },
      });
      if (!shortlist) throw new ElectionError("Candidate is not shortlisted for this position");
      if (new Set(input.panelUserIds).size !== input.panelUserIds.length)
        throw new ElectionError("Panel members must be distinct", "validation");
      const users = await tx.user.findMany({
        where: { id: { in: input.panelUserIds }, isActive: true },
        select: { id: true },
      });
      if (users.length !== input.panelUserIds.length)
        throw new ElectionError("Panel members must be active authenticated users", "validation");
      if (input.scheduledAt && input.durationMinutes) {
        const existing = await tx.electionInterviewPanelMember.findMany({
          where: {
            userId: { in: input.panelUserIds },
            interview: { status: "SCHEDULED", scheduledAt: { not: null } },
          },
          include: { interview: { select: { scheduledAt: true, durationMinutes: true } } },
        });
        const start = input.scheduledAt.getTime(),
          end = start + input.durationMinutes * 60000;
        if (
          existing.some((row) => {
            const at = row.interview.scheduledAt!.getTime();
            const until = at + (row.interview.durationMinutes ?? 0) * 60000;
            return start < until && at < end;
          })
        )
          throw new ElectionError("A panel member already has an overlapping interview");
      }
      const interview = await tx.electionInterview.create({
        data: {
          electionId: input.electionId,
          candidateId: candidate.id,
          positionId: input.positionId,
          status: input.scheduledAt ? "SCHEDULED" : "PLANNED",
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          mode: input.mode,
          location: input.location,
          scheduledByUserId: input.actorUserId,
          panelMembers: { create: input.panelUserIds.map((userId) => ({ userId })) },
        },
        include: { panelMembers: true },
      });
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_INTERVIEW_SCHEDULED,
        candidate.id,
        input.electionId,
      );
      return interview;
    });
  }
  async completeInterview(input: {
    electionId: string;
    interviewId: string;
    candidateAttended: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({
        where: { id: input.interviewId, electionId: input.electionId },
        include: { candidate: true },
      });
      if (!interview) throw new ElectionError("Interview not found", "notFound");
      if (interview.status !== "SCHEDULED" || interview.candidate.status === "WITHDRAWN")
        throw new ElectionError("This interview cannot be completed");
      const result = await tx.electionInterview.updateMany({
        where: { id: interview.id, status: "SCHEDULED" },
        data: {
          status: "COMPLETED",
          candidateAttended: input.candidateAttended,
          completedAt: new Date(),
        },
      });
      if (result.count !== 1) throw new ElectionError("Interview changed; refresh and retry");
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_INTERVIEW_COMPLETED,
        interview.candidateId,
        input.electionId,
      );
      return { id: interview.id, status: "COMPLETED" };
    });
  }
  async submitScores(input: {
    electionId: string;
    interviewId: string;
    actorUserId: string;
    scores: { criterionId: string; score: number; comments?: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({
        where: { id: input.interviewId, electionId: input.electionId },
        include: { candidate: true, panelMembers: { where: { userId: input.actorUserId } } },
      });
      if (!interview) throw new ElectionError("Interview not found", "notFound");
      const member = interview.panelMembers[0];
      if (!member || member.isRecused)
        throw new NotAuthorizedError("Only an assigned, non-recused panel member may score");
      if (
        interview.status !== "COMPLETED" ||
        interview.scoresLockedAt ||
        interview.candidate.status === "WITHDRAWN"
      )
        throw new ElectionError("Scores are not open for this interview");
      if (new Set(input.scores.map((score) => score.criterionId)).size !== input.scores.length)
        throw new ElectionError("Each criterion may be scored once", "validation");
      const criteria = await tx.electionInterviewCriterion.findMany({
        where: {
          electionId: input.electionId,
          id: { in: input.scores.map((score) => score.criterionId) },
        },
      });
      if (
        criteria.length !== input.scores.length ||
        input.scores.some(
          (score) =>
            score.score >
            Number(criteria.find((criterion) => criterion.id === score.criterionId)!.maxScore),
        )
      )
        throw new ElectionError(
          "Score must be within the configured criterion range",
          "validation",
        );
      await Promise.all(
        input.scores.map((score) =>
          tx.electionInterviewScore.upsert({
            where: {
              interviewId_panelMemberId_criterionId: {
                interviewId: interview.id,
                panelMemberId: member.id,
                criterionId: score.criterionId,
              },
            },
            create: {
              interviewId: interview.id,
              panelMemberId: member.id,
              criterionId: score.criterionId,
              score: score.score,
              comments: score.comments,
            },
            update: { score: score.score, comments: score.comments },
          }),
        ),
      );
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_INTERVIEW_SCORE_SUBMITTED,
        interview.candidateId,
        input.electionId,
      );
      return { interviewId: interview.id };
    });
  }
  async lockScores(input: { electionId: string; interviewId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({
        where: { id: input.interviewId, electionId: input.electionId },
        include: { panelMembers: { include: { scores: true } }, candidate: true },
      });
      if (!interview || interview.status !== "COMPLETED")
        throw new ElectionError("Only a completed interview may be locked");
      const criteria = await tx.electionInterviewCriterion.findMany({
        where: { electionId: input.electionId, required: true },
      });
      if (!criteria.length)
        throw new ElectionError("Configure at least one required interview criterion");
      if (
        interview.panelMembers
          .filter((member) => !member.isRecused)
          .some((member) =>
            criteria.some(
              (criterion) => !member.scores.some((score) => score.criterionId === criterion.id),
            ),
          )
      )
        throw new ElectionError("All non-recused panel members must submit required scores");
      const result = await tx.electionInterview.updateMany({
        where: { id: interview.id, scoresLockedAt: null },
        data: { scoresLockedAt: new Date() },
      });
      if (result.count !== 1) throw new ElectionError("Scores are already locked");
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_INTERVIEW_SCORE_LOCKED,
        interview.candidateId,
        input.electionId,
      );
      return { interviewId: interview.id, locked: true };
    });
  }
  async setPanelRecusal(input: {
    electionId: string;
    interviewId: string;
    panelMemberId: string;
    isRecused: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      const interview = await tx.electionInterview.findFirst({
        where: { id: input.interviewId, electionId: input.electionId },
      });
      if (!interview || interview.scoresLockedAt)
        throw new ElectionError("Panel membership is locked for this interview");
      const result = await tx.electionInterviewPanelMember.updateMany({
        where: { id: input.panelMemberId, interviewId: interview.id },
        data: {
          isRecused: input.isRecused,
          conflictDeclaredAt: input.isRecused ? new Date() : null,
        },
      });
      if (result.count !== 1) throw new ElectionError("Panel member not found", "notFound");
      await this.auditCandidate(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_PANEL_MEMBER_RECUSED,
        interview.candidateId,
        input.electionId,
      );
      return { id: input.panelMemberId, isRecused: input.isRecused };
    });
  }
  async lockFinalCandidates(input: {
    electionId: string;
    entries: { candidateId: string; positionId: string }[];
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.processingElection(tx, input.electionId, ["INTERVIEWS"]);
      if (
        new Set(input.entries.map((entry) => `${entry.candidateId}:${entry.positionId}`)).size !==
        input.entries.length
      )
        throw new ElectionError("Final candidate entries must be distinct", "validation");
      for (const entry of input.entries) {
        const candidate = await this.processingCandidate(tx, input.electionId, entry.candidateId);
        const shortlisted = await tx.electionShortlistEntry.findFirst({
          where: {
            electionId: input.electionId,
            candidateId: candidate.id,
            positionId: entry.positionId,
          },
        });
        const interview = await tx.electionInterview.findFirst({
          where: {
            electionId: input.electionId,
            candidateId: candidate.id,
            positionId: entry.positionId,
          },
        });
        const unresolved =
          (await tx.electionObjection.count({
            where: { candidateId: candidate.id, status: "OPEN" },
          })) +
          (await tx.electionCorrectionRequest.count({
            where: { candidateId: candidate.id, status: { in: ["OPEN", "SUBMITTED"] } },
          }));
        if (
          !shortlisted ||
          !interview ||
          interview.status !== "COMPLETED" ||
          !interview.scoresLockedAt ||
          unresolved ||
          candidate.status === "WITHDRAWN" ||
          candidate.status === "INELIGIBLE"
        )
          throw new ElectionError(
            "Every final candidate must be eligible, shortlisted, fully evaluated, and free of unresolved processing",
          );
      }
      await tx.electionFinalCandidate.createMany({
        data: input.entries.map((entry) => ({
          electionId: input.electionId,
          candidateId: entry.candidateId,
          positionId: entry.positionId,
          lockedByUserId: input.actorUserId,
        })),
      });
      await tx.electionCandidate.updateMany({
        where: { id: { in: input.entries.map((entry) => entry.candidateId) } },
        data: { status: "FINAL_CANDIDATE" },
      });
      const result = await tx.election.updateMany({
        where: { id: input.electionId, status: "INTERVIEWS" },
        data: { status: "FINAL_CANDIDATES" },
      });
      if (result.count !== 1) throw new ElectionError("Election state changed; refresh and retry");
      await this.audit(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_FINAL_CANDIDATES_LOCKED,
        input.electionId,
      );
      return { entries: input.entries, status: "FINAL_CANDIDATES" };
    });
  }
  async saveVoterRosterEntry(input: {
    electionId: string;
    voterGroup: "FACULTY" | "EX_COUNCIL";
    userId: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.locked(tx, input.electionId);
      if (election.voterSnapshotLockedAt)
        throw new ElectionError("The voter snapshot is locked and roster entries cannot change");
      const user = await tx.user.findFirst({
        where: { id: input.userId, isActive: true },
        select: { id: true },
      });
      if (!user)
        throw new ElectionError(
          "Roster entries must reference an active authenticated user",
          "validation",
        );
      const entry =
        input.voterGroup === "FACULTY"
          ? await tx.electionFacultyRosterEntry.upsert({
              where: { electionId_userId: { electionId: input.electionId, userId: input.userId } },
              create: { electionId: input.electionId, userId: input.userId },
              update: {},
            })
          : await tx.electionExCouncilRosterEntry.upsert({
              where: { electionId_userId: { electionId: input.electionId, userId: input.userId } },
              create: { electionId: input.electionId, userId: input.userId },
              update: {},
            });
      await this.audit(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_VOTER_ROSTER_UPDATED,
        election.id,
      );
      return { id: entry.id, voterGroup: input.voterGroup, userId: entry.userId };
    });
  }
  async removeVoterRosterEntry(input: {
    electionId: string;
    voterGroup: "FACULTY" | "EX_COUNCIL";
    entryId: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.locked(tx, input.electionId);
      if (election.voterSnapshotLockedAt)
        throw new ElectionError("The voter snapshot is locked and roster entries cannot change");
      const result =
        input.voterGroup === "FACULTY"
          ? await tx.electionFacultyRosterEntry.deleteMany({
              where: { id: input.entryId, electionId: input.electionId },
            })
          : await tx.electionExCouncilRosterEntry.deleteMany({
              where: { id: input.entryId, electionId: input.electionId },
            });
      if (result.count !== 1) throw new ElectionError("Voter roster entry not found", "notFound");
      await this.audit(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_VOTER_ROSTER_UPDATED,
        election.id,
      );
      return { id: input.entryId, removed: true };
    });
  }
  async voterRoster(electionId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      select: { type: true, voterSnapshotLockedAt: true },
    });
    if (!election) throw new ElectionError("Election not found", "notFound");
    if (election.type !== "COUNCIL")
      throw new ElectionError(
        "Core Committee selections are managed outside the election workflow",
      );
    const [faculty, exCouncil] = await Promise.all([
      this.prisma.electionFacultyRosterEntry.findMany({
        where: { electionId },
        select: { id: true, userId: true, user: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.electionExCouncilRosterEntry.findMany({
        where: { electionId },
        select: { id: true, userId: true, user: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      lockedAt: election.voterSnapshotLockedAt,
      faculty: faculty.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        email: entry.user.email,
      })),
      exCouncil: exCouncil.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        email: entry.user.email,
      })),
    };
  }
  async lockVoterSnapshot(input: { electionId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.locked(tx, input.electionId);
      if (election.status !== "FINAL_CANDIDATES")
        throw new ElectionError("Lock the voter snapshot after final candidates are confirmed");
      const existing = await tx.electionVoterSnapshot.count({
        where: { electionId: input.electionId },
      });
      if (election.voterSnapshotLockedAt)
        return {
          lockedAt: election.voterSnapshotLockedAt,
          voters: await this.snapshotCounts(tx, input.electionId),
        };
      if (existing)
        throw new ElectionError(
          "Voter snapshot rows exist without a snapshot lock; investigate before proceeding",
        );
      const [students, faculty, exCouncil] = await Promise.all([
        tx.user.findMany({
          where: { role: "STUDENT", isActive: true, studentProfile: { isActive: true } },
          select: { id: true },
        }),
        tx.electionFacultyRosterEntry.findMany({
          where: { electionId: input.electionId, user: { isActive: true } },
          select: { userId: true },
        }),
        tx.electionExCouncilRosterEntry.findMany({
          where: { electionId: input.electionId, user: { isActive: true } },
          select: { userId: true },
        }),
      ]);
      const voters = [
        ...students.map(({ id }) => ({ userId: id, voterGroup: "STUDENT" as const })),
        ...faculty.map(({ userId }) => ({ userId, voterGroup: "FACULTY" as const })),
        ...exCouncil.map(({ userId }) => ({ userId, voterGroup: "EX_COUNCIL" as const })),
      ];
      if (new Set(voters.map((voter) => voter.userId)).size !== voters.length)
        throw new ElectionError(
          "A voter appears in multiple Council voter groups; resolve the roster before locking",
          "validation",
        );
      if (!voters.length)
        throw new ElectionError("Cannot lock an empty Council voter snapshot", "validation");
      await tx.electionVoterSnapshot.createMany({
        data: voters.map((voter) => ({ electionId: input.electionId, ...voter })),
      });
      const lockedAt = new Date();
      const result = await tx.election.updateMany({
        where: { id: input.electionId, voterSnapshotLockedAt: null },
        data: { voterSnapshotLockedAt: lockedAt, voterSnapshotLockedByUserId: input.actorUserId },
      });
      if (result.count !== 1) throw new ElectionError("Voter snapshot changed; refresh and retry");
      await this.audit(
        tx,
        input.actorUserId,
        AUDIT_ACTIONS.ELECTION_VOTER_SNAPSHOT_LOCKED,
        input.electionId,
      );
      return { lockedAt, voters: await this.snapshotCounts(tx, input.electionId) };
    });
  }
  private async snapshotCounts(tx: Prisma.TransactionClient, electionId: string) {
    const rows = await tx.electionVoterSnapshot.groupBy({
      by: ["voterGroup"],
      where: { electionId },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.voterGroup, row._count._all]));
  }
  private async votingElection(tx: Prisma.TransactionClient, electionId: string) {
    const election = await this.locked(tx, electionId);
    if (election.status !== "VOTING")
      throw new ElectionError("Voting is not open for this election");
    assertVotingSchedule(record(election));
    const now = new Date();
    if (now < election.votingOpenAt! || now >= election.votingCloseAt!)
      throw new ElectionError("Voting is outside the configured window");
    return election;
  }
  async ballot(electionId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.votingElection(tx, electionId);
      const snapshot = await tx.electionVoterSnapshot.findUnique({
        where: { electionId_userId: { electionId, userId } },
        select: { voterGroup: true },
      });
      if (!snapshot)
        throw new NotAuthorizedError("You are not in the locked Council voter snapshot");
      const participation = await tx.electionVoterParticipation.findUnique({
        where: { electionId_userId: { electionId, userId } },
        select: { status: true, submittedAt: true },
      });
      const finalCandidates = await tx.electionFinalCandidate.findMany({
        where: { electionId },
        include: {
          position: { select: { id: true, title: true, seats: true, displayOrder: true } },
          candidate: {
            include: {
              applicant: {
                select: { email: true, studentProfile: { select: { fullName: true } } },
              },
            },
          },
        },
        orderBy: { position: { displayOrder: "asc" } },
      });
      const positions = new Map<
        string,
        { id: string; title: string; seats: number; candidates: { id: string; name: string }[] }
      >();
      for (const entry of finalCandidates) {
        const current = positions.get(entry.positionId) ?? {
          id: entry.position.id,
          title: entry.position.title,
          seats: entry.position.seats,
          candidates: [],
        };
        current.candidates.push({
          id: entry.candidateId,
          name:
            entry.candidate.applicant.studentProfile?.fullName ?? entry.candidate.applicant.email,
        });
        positions.set(entry.positionId, current);
      }
      return {
        voterGroup: snapshot.voterGroup,
        participation,
        notaEnabled: (
          await tx.election.findUniqueOrThrow({
            where: { id: electionId },
            select: { notaEnabled: true },
          })
        ).notaEnabled,
        positions: [...positions.values()],
      };
    });
  }
  async castBallot(input: {
    electionId: string;
    userId: string;
    choices: { positionId: string; candidateId?: string; isNota?: boolean }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.votingElection(tx, input.electionId);
      const snapshot = await tx.electionVoterSnapshot.findUnique({
        where: { electionId_userId: { electionId: input.electionId, userId: input.userId } },
        select: { id: true, voterGroup: true },
      });
      if (!snapshot)
        throw new NotAuthorizedError("You are not in the locked Council voter snapshot");
      if (new Set(input.choices.map((choice) => choice.positionId)).size !== input.choices.length)
        throw new ElectionError("Choose once for each position", "validation");
      const finalCandidates = await tx.electionFinalCandidate.findMany({
        where: { electionId: input.electionId },
        select: { candidateId: true, positionId: true },
      });
      const positionIds = new Set(finalCandidates.map((entry) => entry.positionId));
      if (
        input.choices.length !== positionIds.size ||
        input.choices.some((choice) => !positionIds.has(choice.positionId))
      )
        throw new ElectionError("Choose once for every final-candidate position", "validation");
      for (const choice of input.choices) {
        const nota = choice.isNota === true;
        if (nota === Boolean(choice.candidateId))
          throw new ElectionError(
            "Each ballot choice must select one candidate or NOTA",
            "validation",
          );
        if (nota && !election.notaEnabled)
          throw new ElectionError("NOTA is not enabled for this Council election", "validation");
        if (
          choice.candidateId &&
          !finalCandidates.some(
            (candidate) =>
              candidate.candidateId === choice.candidateId &&
              candidate.positionId === choice.positionId,
          )
        )
          throw new ElectionError(
            "A ballot candidate must be final for the selected position",
            "validation",
          );
      }
      await tx.electionVoterParticipation.create({
        data: { electionId: input.electionId, userId: input.userId, status: "CAST" },
      });
      await tx.electionBallot.create({
        data: {
          electionId: input.electionId,
          voterGroup: snapshot.voterGroup,
          choices: {
            create: input.choices.map((choice) => ({
              isNota: choice.isNota === true,
              position: {
                connect: {
                  id_electionId: { id: choice.positionId, electionId: input.electionId },
                },
              },
              ...(choice.candidateId
                ? {
                    candidate: {
                      connect: {
                        id_electionId: { id: choice.candidateId, electionId: input.electionId },
                      },
                    },
                  }
                : {}),
            })),
          },
        },
      });
      return { submitted: true };
    });
  }
  async abstain(input: { electionId: string; userId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await this.votingElection(tx, input.electionId);
      const snapshot = await tx.electionVoterSnapshot.findUnique({
        where: { electionId_userId: { electionId: input.electionId, userId: input.userId } },
        select: { id: true },
      });
      if (!snapshot)
        throw new NotAuthorizedError("You are not in the locked Council voter snapshot");
      await tx.electionVoterParticipation.create({
        data: { electionId: input.electionId, userId: input.userId, status: "ABSTAINED" },
      });
      return { abstained: true };
    });
  }
  async turnout(electionId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      select: { type: true },
    });
    if (!election) throw new ElectionError("Election not found", "notFound");
    if (election.type !== "COUNCIL")
      throw new ElectionError(
        "Core Committee selections are managed outside the election workflow",
      );
    const [snapshots, participation] = await Promise.all([
      this.prisma.electionVoterSnapshot.groupBy({
        by: ["voterGroup"],
        where: { electionId },
        _count: { _all: true },
      }),
      this.prisma.electionVoterParticipation.groupBy({
        by: ["status"],
        where: { electionId },
        _count: { _all: true },
      }),
    ]);
    const eligible = Object.fromEntries(snapshots.map((row) => [row.voterGroup, row._count._all]));
    const submitted = Object.fromEntries(participation.map((row) => [row.status, row._count._all]));
    const cast = submitted.CAST ?? 0;
    const abstained = submitted.ABSTAINED ?? 0;
    return { eligible, cast, abstained, participation: cast + abstained };
  }
  async closeVoting(input: { electionId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const election = await this.locked(tx, input.electionId);
      if (election.status !== "VOTING") throw new ElectionError("Voting is not open for this election");
      assertCouncilSingleSeat(record(election).positions);
      if (!election.votingCloseAt || new Date() < election.votingCloseAt)
        throw new ElectionError("Voting cannot close before its configured closing time", "validation");
      const updated = await tx.election.updateMany({
        where: { id: input.electionId, status: "VOTING" },
        data: { status: "COUNTING" },
      });
      if (updated.count !== 1) throw new ElectionError("Election state changed; refresh and retry");
      await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_VOTING_CLOSED, input.electionId);
      return record(await this.locked(tx, input.electionId));
    });
  }
  async countResults(input: { electionId: string; actorUserId: string }) {
    return this.prisma.$transaction(
      async (tx) => {
        const election = await this.locked(tx, input.electionId);
        if (election.status !== "COUNTING")
          throw new ElectionError("Close voting before starting the authoritative count");
        if (!election.voterSnapshotLockedAt || !election.voterSnapshotLockedByUserId)
          throw new ElectionError("Lock the Council voter snapshot before counting", "validation");
        assertCouncilSingleSeat(record(election).positions);
        if (await tx.electionResultSnapshot.count({ where: { electionId: input.electionId } }))
          throw new ElectionError("A result snapshot already exists; recounts are not available in Slice 4");

        const groups: ResultVoterGroup[] = ["STUDENT", "FACULTY", "EX_COUNCIL"];
        for (const position of election.positions) {
          const byGroup = new Map(position.weights.map((weight) => [weight.voterGroup, weight.percentage]));
          if (
            byGroup.size !== groups.length ||
            groups.some((group) => !byGroup.has(group)) ||
            ![...byGroup.values()].reduce((sum, weight) => sum.plus(weight), new Prisma.Decimal(0)).equals(100)
          )
            throw new ElectionError("Council position weights must be locked for all voter groups and total 100%", "validation");
        }
        const finalCandidates = await tx.electionFinalCandidate.findMany({
          where: { electionId: input.electionId },
          include: {
            position: { select: { id: true, title: true, seats: true, weights: true } },
            candidate: {
              include: { applicant: { select: { email: true, studentProfile: { select: { fullName: true } } } } },
            },
          },
        });
        const candidatesByPosition = new Map<string, typeof finalCandidates>();
        for (const candidate of finalCandidates) {
          const entries = candidatesByPosition.get(candidate.positionId) ?? [];
          entries.push(candidate);
          candidatesByPosition.set(candidate.positionId, entries);
        }
        if (
          election.positions.some(
            (position) => !(candidatesByPosition.get(position.id)?.length),
          )
        )
          throw new ElectionError("Every Council position requires final candidates before counting", "validation");

        const [snapshotRows, ballots, participationRows] = await Promise.all([
          tx.electionVoterSnapshot.groupBy({
            by: ["voterGroup"],
            where: { electionId: input.electionId },
            _count: { _all: true },
          }),
          tx.electionBallot.findMany({
            where: { electionId: input.electionId },
            select: { id: true, voterGroup: true, choices: { select: { positionId: true, candidateId: true, isNota: true } } },
          }),
          tx.$queryRaw<{ voterGroup: ResultVoterGroup; status: "CAST" | "ABSTAINED"; count: number }[]>`
            SELECT s."voterGroup", p."status", COUNT(*)::integer AS "count"
            FROM "election_voter_participations" p
            JOIN "election_voter_snapshots" s
              ON s."electionId" = p."electionId" AND s."userId" = p."userId"
            WHERE p."electionId" = ${input.electionId}::uuid
            GROUP BY s."voterGroup", p."status"`,
        ]);
        if (ballots.some((ballot) => ballot.voterGroup === null))
          throw new ElectionError("A legacy ballot has no anonymous voter group and cannot be counted", "validation");
        const eligible = new Map(groups.map((group) => [group, 0]));
        snapshotRows.forEach((row) => eligible.set(row.voterGroup, row._count._all));
        const participation = new Map(groups.map((group) => [group, { cast: 0, abstained: 0 }]));
        participationRows.forEach((row) => {
          const group = participation.get(row.voterGroup)!;
          if (row.status === "CAST") group.cast = row.count;
          else group.abstained = row.count;
        });
        if (ballots.length !== [...participation.values()].reduce((sum, row) => sum + row.cast, 0))
          throw new ElectionError("Ballot and participation totals do not agree; counting stopped", "validation");
        const ballotsByGroup = new Map(groups.map((group) => [group, 0]));
        const positionIds = new Set(election.positions.map((position) => position.id));
        const validFinalCandidate = new Set(
          finalCandidates.map((candidate) => `${candidate.positionId}:${candidate.candidateId}`),
        );
        const tallies = new Map(
          election.positions.map((position) => [
            position.id,
            new Map(
              groups.map((group) => [
                group,
                { nota: 0, votes: new Map((candidatesByPosition.get(position.id) ?? []).map((candidate) => [candidate.candidateId, 0])) },
              ]),
            ),
          ]),
        );
        for (const ballot of ballots) {
          const voterGroup = ballot.voterGroup as ResultVoterGroup;
          if (!groups.includes(voterGroup)) throw new ElectionError("Ballot has an invalid voter group", "validation");
          ballotsByGroup.set(voterGroup, ballotsByGroup.get(voterGroup)! + 1);
          if (ballot.choices.length !== positionIds.size)
            throw new ElectionError("A ballot does not contain exactly one choice for every position", "validation");
          const seenPositions = new Set<string>();
          for (const choice of ballot.choices) {
            if (!positionIds.has(choice.positionId) || seenPositions.has(choice.positionId))
              throw new ElectionError("A ballot contains an invalid or duplicate position", "validation");
            seenPositions.add(choice.positionId);
            if (choice.isNota) {
              if (!election.notaEnabled || choice.candidateId)
                throw new ElectionError("A ballot contains an invalid NOTA choice", "validation");
              tallies.get(choice.positionId)!.get(voterGroup)!.nota += 1;
            } else {
              if (!choice.candidateId || !validFinalCandidate.has(`${choice.positionId}:${choice.candidateId}`))
                throw new ElectionError("A ballot contains a non-final candidate choice", "validation");
              const votes = tallies.get(choice.positionId)!.get(voterGroup)!.votes;
              votes.set(choice.candidateId, (votes.get(choice.candidateId) ?? 0) + 1);
            }
          }
        }
        for (const group of groups)
          if (ballotsByGroup.get(group) !== participation.get(group)!.cast)
            throw new ElectionError("Ballot group totals do not agree with participation; counting stopped", "validation");

        const computed = election.positions.map((position) => {
          const positionCandidates = candidatesByPosition.get(position.id)!;
          return {
            position,
            result: computePositionResult(
              positionCandidates.map((candidate) => ({
                id: candidate.candidateId,
                name: candidate.candidate.applicant.studentProfile?.fullName ?? candidate.candidate.applicant.email,
              })),
              groups.map((voterGroup) => {
                const tally = tallies.get(position.id)!.get(voterGroup)!;
                const voting = participation.get(voterGroup)!;
                const quorumPercent =
                  voterGroup === "STUDENT"
                    ? election.studentQuorumPercent
                    : voterGroup === "FACULTY"
                      ? election.facultyQuorumPercent
                      : election.exCouncilQuorumPercent;
                return {
                  voterGroup,
                  eligibleCount: eligible.get(voterGroup)!,
                  participationCount: voting.cast + voting.abstained,
                  abstentionCount: voting.abstained,
                  notaVoteCount: tally.nota,
                  quorumPercent,
                  configuredWeight: position.weights.find((weight) => weight.voterGroup === voterGroup)!.percentage,
                  candidateVotes: tally.votes,
                };
              }),
            ),
          };
        });
        const overallStatus = computed.some((entry) => entry.result.status === "QUORUM_FAILED")
          ? "QUORUM_FAILED"
          : computed.some((entry) => entry.result.status === "RUNOFF_REQUIRED")
            ? "RUNOFF_REQUIRED"
            : computed.some((entry) => entry.result.status === "NOTA_WON")
              ? "NOTA_WON"
              : "RESULT_REVIEW";
        const snapshot = await tx.electionResultSnapshot.create({
          data: { electionId: input.electionId, version: 1, status: overallStatus, countedByUserId: input.actorUserId },
        });
        for (const entry of computed) {
          const positionResult = await tx.electionPositionResult.create({
            data: {
              snapshotId: snapshot.id,
              electionId: input.electionId,
              positionId: entry.position.id,
              positionTitle: entry.position.title,
              status: entry.result.status,
              notaFinalScore: entry.result.notaFinalScore,
            },
          });
          const groupRows = new Map<string, string>();
          for (const group of entry.result.groups) {
            const row = await tx.electionPositionGroupResult.create({
              data: {
                positionResultId: positionResult.id,
                voterGroup: group.voterGroup,
                eligibleCount: group.eligibleCount,
                participationCount: group.participationCount,
                abstentionCount: group.abstentionCount,
                notaVoteCount: group.notaVoteCount,
                scoringDenominator: group.scoringDenominator,
                quorumPercent: group.quorumPercent,
                quorumMet: group.quorumMet,
                configuredWeight: group.configuredWeight,
                notaNormalizedScore: group.notaNormalizedScore,
              },
            });
            groupRows.set(group.voterGroup, row.id);
          }
          for (const candidate of entry.result.candidates) {
            const candidateResult = await tx.electionCandidateResult.create({
              data: {
                positionResultId: positionResult.id,
                electionId: input.electionId,
                candidateId: candidate.id,
                candidateName: candidate.name,
                rawRank: candidate.rawRank,
                isProvisionalWinner: candidate.isProvisionalWinner,
                finalScore: candidate.finalScore,
              },
            });
            await tx.electionCandidateGroupResult.createMany({
              data: candidate.groups.map((group) => ({
                candidateResultId: candidateResult.id,
                positionGroupResultId: groupRows.get(group.voterGroup)!,
                rawVoteCount: group.rawVoteCount,
                normalizedScore: group.normalizedScore,
              })),
            });
          }
        }
        const state = await tx.election.updateMany({
          where: { id: input.electionId, status: "COUNTING" },
          data: { status: "RESULT_REVIEW" },
        });
        if (state.count !== 1) throw new ElectionError("Election state changed; refresh and retry");
        await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_COUNT_STARTED, input.electionId, { version: snapshot.version });
        await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_RESULT_VERSION_CREATED, input.electionId, { version: snapshot.version });
        await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_RESULT_COUNTED, input.electionId, { version: snapshot.version, status: overallStatus });
        if (overallStatus === "QUORUM_FAILED")
          await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_QUORUM_FAILED, input.electionId, { version: snapshot.version });
        if (overallStatus === "NOTA_WON")
          await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_NOTA_WON, input.electionId, { version: snapshot.version });
        if (overallStatus === "RUNOFF_REQUIRED")
          await this.audit(tx, input.actorUserId, AUDIT_ACTIONS.ELECTION_RUNOFF_REQUIRED, input.electionId, { version: snapshot.version });
        return { version: snapshot.version, status: overallStatus };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async results(electionId: string) {
    const election = await this.prisma.election.findUnique({ where: { id: electionId }, select: { type: true } });
    if (!election) throw new ElectionError("Election not found", "notFound");
    if (election.type !== "COUNCIL")
      throw new ElectionError("Core Committee selections are managed outside the election workflow");
    const result = await this.prisma.electionResultSnapshot.findFirst({
      where: { electionId },
      orderBy: { version: "desc" },
      include: {
        positions: {
          orderBy: { position: { displayOrder: "asc" } },
          include: {
            groups: { orderBy: { voterGroup: "asc" } },
            candidates: { orderBy: [{ rawRank: "asc" }, { candidateName: "asc" }], include: { groups: true } },
          },
        },
      },
    });
    if (!result) throw new ElectionError("No counted result is available", "notFound");
    return result;
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
        interviews: {
          include: {
            panelMembers: isSecretary
              ? { include: { user: { select: { id: true, email: true } } } }
              : { where: { userId: actorUserId } },
          },
        },
        finalCandidates: true,
      },
    });
    const criteria = await this.prisma.electionInterviewCriterion.findMany({
      where: { electionId },
      orderBy: { displayOrder: "asc" },
    });
    const assignedInterviews =
      isSecretary || !actorUserId
        ? []
        : await this.prisma.electionInterview.findMany({
            where: { electionId, panelMembers: { some: { userId: actorUserId } } },
            include: {
              candidate: {
                include: {
                  applicant: { select: { id: true, email: true } },
                  positions: { include: { position: true } },
                },
              },
              position: true,
              panelMembers: { where: { userId: actorUserId }, include: { scores: true } },
              scores: { where: { panelMember: { userId: actorUserId } } },
            },
            orderBy: { scheduledAt: "asc" },
          });
    return { candidates, criteria, assignedInterviews };
  }
  async panelAssignments(userId: string) {
    return this.prisma.electionInterview.findMany({
      where: { panelMembers: { some: { userId } } },
      include: {
        election: { select: { id: true, title: true, status: true } },
        candidate: {
          include: {
            applicant: { select: { email: true, studentProfile: { select: { fullName: true } } } },
          },
        },
        position: { select: { title: true } },
        panelMembers: { where: { userId }, include: { scores: true } },
        scores: { where: { panelMember: { userId } } },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }
}
