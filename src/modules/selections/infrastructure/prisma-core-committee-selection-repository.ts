import { Prisma, type PrismaClient, type Prisma as PrismaTypes } from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import {
  CoreCommitteeSelectionError,
  assertSelectionDraft,
  assertSelectionTransition,
} from "../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionConfig,
  CoreCommitteeSelectionPositionConfig,
  CoreCommitteeSelectionStatus,
} from "../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionCandidateRecord,
  CoreCommitteeSelectionRecord,
} from "../domain/entities";
import type { CoreCommitteeSelectionRepository } from "../application/ports/core-committee-selection-repository";

const selectionInclude = {
  positions: { orderBy: { displayOrder: "asc" as const } },
  applicationForm: { include: { form: true } },
};
type SelectionRow = PrismaTypes.CoreCommitteeSelectionGetPayload<{
  include: typeof selectionInclude;
}>;
const identityKey = (title: string) =>
  title
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function toRecord(row: SelectionRow): CoreCommitteeSelectionRecord {
  return {
    id: row.id,
    title: row.title,
    academicYear: row.academicYear,
    status: row.status,
    applicationOpenAt: row.applicationOpenAt,
    applicationCloseAt: row.applicationCloseAt,
    correctionOpenAt: row.correctionOpenAt,
    correctionCloseAt: row.correctionCloseAt,
    maxPositionsPerCandidate: row.maxPositionsPerCandidate,
    configurationLockedAt: row.configurationLockedAt,
    createdAt: row.createdAt,
    positions: row.positions.map((position) => ({
      id: position.id,
      title: position.title,
      description: position.description,
      seats: position.seats,
      displayOrder: position.displayOrder,
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
async function lockSelection(tx: PrismaTypes.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "core_committee_selections" WHERE "id" = ${id}::uuid FOR UPDATE`;
  const row = await tx.coreCommitteeSelection.findUnique({
    where: { id },
    include: selectionInclude,
  });
  if (!row) throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
  return row;
}
export class PrismaCoreCommitteeSelectionRepository implements CoreCommitteeSelectionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async list(includeDrafts: boolean) {
    const rows = await this.prisma.coreCommitteeSelection.findMany({
      where: includeDrafts ? undefined : { status: { not: "DRAFT" } },
      include: selectionInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRecord);
  }
  async get(id: string) {
    const row = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id },
      include: selectionInclude,
    });
    return row ? toRecord(row) : null;
  }
  async create(config: CoreCommitteeSelectionConfig, actorUserId: string) {
    const row = await this.prisma.coreCommitteeSelection.create({
      data: { ...config, createdByUserId: actorUserId },
      include: selectionInclude,
    });
    await new PrismaAuditRecorder(this.prisma).record({
      actorUserId,
      action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_CREATED,
      targetEntityType: "CoreCommitteeSelection",
      targetEntityId: row.id,
    });
    return toRecord(row);
  }
  async update(id: string, config: CoreCommitteeSelectionConfig, actorUserId: string) {
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await lockSelection(tx, id);
      assertSelectionDraft(current.status);
      const updated = await tx.coreCommitteeSelection.update({
        where: { id },
        data: config,
        include: selectionInclude,
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_UPDATED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: id,
      });
      return updated;
    });
    return toRecord(row);
  }
  async savePosition(
    selectionId: string,
    positionId: string | null,
    config: CoreCommitteeSelectionPositionConfig,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, selectionId);
      assertSelectionDraft(selection.status);
      const data = { ...config, identityKey: identityKey(config.title) };
      if (positionId) {
        const result = await tx.coreCommitteeSelectionPosition.updateMany({
          where: { id: positionId, selectionId },
          data,
        });
        if (result.count !== 1)
          throw new CoreCommitteeSelectionError("Selection position not found", "notFound");
      } else await tx.coreCommitteeSelectionPosition.create({ data: { selectionId, ...data } });
      await new PrismaAuditRecorder(tx).record({
        actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_POSITION_SAVED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selectionId,
      });
      const updated = await tx.coreCommitteeSelection.findUnique({
        where: { id: selectionId },
        include: selectionInclude,
      });
      if (!updated)
        throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
      return toRecord(updated);
    });
  }
  async linkForm(selectionId: string, formId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, selectionId);
      assertSelectionDraft(selection.status);
      await tx.$queryRaw`SELECT "id" FROM "forms" WHERE "id" = ${formId}::uuid FOR UPDATE`;
      const form = await tx.form.findUnique({
        where: { id: formId },
        include: { electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true },
      });
      if (!form) throw new CoreCommitteeSelectionError("Form not found", "notFound");
      if (
        form.electionApplicationForm ||
        (form.coreCommitteeSelectionApplicationForm &&
          form.coreCommitteeSelectionApplicationForm.selectionId !== selectionId)
      )
        throw new CoreCommitteeSelectionError(
          "Form is already associated with another governance process",
        );
      await tx.coreCommitteeSelectionApplicationForm.upsert({
        where: { selectionId },
        create: { selectionId, formId },
        update: { formId },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_FORM_LINKED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selectionId,
        metadata: { formId },
      });
      const updated = await tx.coreCommitteeSelection.findUnique({
        where: { id: selectionId },
        include: selectionInclude,
      });
      if (!updated)
        throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
      return toRecord(updated);
    });
  }
  async transition(
    selectionId: string,
    status: Exclude<CoreCommitteeSelectionStatus, "DRAFT">,
    actorUserId: string,
  ) {
    const row = await this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, selectionId);
      assertSelectionTransition(selection.status, status);
      if (status === "APPLICATION_OPEN") {
        if (
          !selection.applicationForm ||
          selection.applicationForm.form.status !== "PUBLISHED" ||
          !selection.positions.length
        )
          throw new CoreCommitteeSelectionError(
            "Opening requires a published form and at least one position",
            "validation",
          );
        const now = new Date();
        if (now < selection.applicationOpenAt || now >= selection.applicationCloseAt)
          throw new CoreCommitteeSelectionError(
            "Application window is not currently open",
            "validation",
          );
      }
      if (status === "SELECTION_DECIDED") {
        const finalized = await tx.coreCommitteeSelectionDecision.count({
          where: { selectionId, state: "FINALIZED" },
        });
        if (!finalized)
          throw new CoreCommitteeSelectionError(
            "Finalize at least one recorded Council decision before deciding the selection",
            "validation",
          );
      }
      const data: PrismaTypes.CoreCommitteeSelectionUpdateInput = { status };
      if (status === "APPLICATION_OPEN")
        Object.assign(data, {
          configurationLockedAt: new Date(),
          configurationLockedBy: { connect: { id: actorUserId } },
          openedAt: new Date(),
        });
      if (status === "APPLICATION_CLOSED") Object.assign(data, { closedAt: new Date() });
      const updated = await tx.coreCommitteeSelection.update({
        where: { id: selectionId },
        data,
        include: selectionInclude,
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_STATUS_CHANGED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selectionId,
        metadata: { status },
      });
      return updated;
    });
    return toRecord(row);
  }
  async candidates(
    selectionId: string,
    applicantUserId?: string,
  ): Promise<CoreCommitteeSelectionCandidateRecord[]> {
    const rows = await this.prisma.coreCommitteeSelectionCandidate.findMany({
      where: { selectionId, applicantUserId },
      include: {
        applicant: { include: { studentProfile: true } },
        positions: { include: { position: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      selectionId: row.selectionId,
      applicationId: row.applicationId,
      applicantUserId: row.applicantUserId,
      applicantName: row.applicant.studentProfile?.fullName ?? row.applicant.email,
      status: row.status,
      createdAt: row.createdAt,
      positions: row.positions.map((item) => ({
        id: item.position.id,
        title: item.position.title,
      })),
    }));
  }
  private async requireStage(
    tx: PrismaTypes.TransactionClient,
    selectionId: string,
    stage: CoreCommitteeSelectionStatus,
  ) {
    const selection = await lockSelection(tx, selectionId);
    if (selection.status !== stage)
      throw new CoreCommitteeSelectionError(`Operation requires ${stage.replaceAll("_", " ")}`);
    return selection;
  }
  async recordScrutiny(input: {
    selectionId: string;
    candidateId: string;
    decision: "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED";
    reason: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "SCRUTINY");
      const updated = await tx.coreCommitteeSelectionCandidate.updateMany({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          status: { not: "WITHDRAWN" },
        },
        data: { status: input.decision },
      });
      if (updated.count !== 1)
        throw new CoreCommitteeSelectionError("Candidate not found or withdrawn", "notFound");
      const review = await tx.coreCommitteeSelectionScrutinyReview.create({
        data: {
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          decision: input.decision,
          reason: input.reason,
          reviewerUserId: input.actorUserId,
        },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_SCRUTINY_RECORDED,
        targetEntityType: "CoreCommitteeSelectionCandidate",
        targetEntityId: input.candidateId,
      });
      return review;
    });
  }
  async requestCorrection(input: {
    selectionId: string;
    candidateId: string;
    instructions: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.status !== "SCRUTINY" && selection.status !== "CORRECTIONS")
        throw new CoreCommitteeSelectionError("Corrections are not open");
      const candidate = await tx.coreCommitteeSelectionCandidate.updateMany({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          status: "CORRECTION_REQUIRED",
        },
        data: {},
      });
      if (candidate.count !== 1)
        throw new CoreCommitteeSelectionError(
          "Candidate does not require correction",
          "validation",
        );
      return tx.coreCommitteeSelectionCorrectionRequest.create({
        data: {
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          instructions: input.instructions,
          requestedByUserId: input.actorUserId,
        },
      });
    });
  }
  async submitCorrection(input: {
    selectionId: string;
    candidateId: string;
    statement: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "CORRECTIONS");
      const candidate = await tx.coreCommitteeSelectionCandidate.findFirst({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          applicantUserId: input.actorUserId,
        },
      });
      if (!candidate) throw new CoreCommitteeSelectionError("Candidate not found", "notFound");
      const request = await tx.coreCommitteeSelectionCorrectionRequest.findFirst({
        where: { selectionId: input.selectionId, candidateId: input.candidateId, status: "OPEN" },
        orderBy: { createdAt: "desc" },
      });
      if (!request)
        throw new CoreCommitteeSelectionError("No open correction request", "validation");
      return tx.coreCommitteeSelectionCorrectionRequest.update({
        where: { id: request.id },
        data: {
          status: "SUBMITTED",
          statement: input.statement,
          submittedByUserId: input.actorUserId,
          submittedAt: new Date(),
        },
      });
    });
  }
  async shortlist(input: {
    selectionId: string;
    candidateId: string;
    positionIds: string[];
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "SHORTLIST");
      const candidate = await tx.coreCommitteeSelectionCandidate.findUnique({
        where: { id_selectionId: { id: input.candidateId, selectionId: input.selectionId } },
        include: { positions: true },
      });
      if (!candidate || candidate.status !== "ELIGIBLE")
        throw new CoreCommitteeSelectionError(
          "Only eligible candidates may be shortlisted",
          "validation",
        );
      const valid = new Set(candidate.positions.map((position) => position.positionId));
      if (!input.positionIds.length || input.positionIds.some((id) => !valid.has(id)))
        throw new CoreCommitteeSelectionError(
          "Select positions applied for by this candidate",
          "validation",
        );
      await tx.coreCommitteeSelectionShortlistEntry.createMany({
        data: input.positionIds.map((positionId) => ({
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          positionId,
          shortlistedByUserId: input.actorUserId,
        })),
        skipDuplicates: true,
      });
      await tx.coreCommitteeSelectionCandidate.update({
        where: { id: input.candidateId },
        data: { status: "SHORTLISTED" },
      });
      return { candidateId: input.candidateId };
    });
  }
  async createInterview(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    scheduledAt?: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "INTERVIEWS");
      const listed = await tx.coreCommitteeSelectionShortlistEntry.findFirst({
        where: {
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          positionId: input.positionId,
        },
      });
      if (!listed)
        throw new CoreCommitteeSelectionError(
          "Candidate is not shortlisted for this position",
          "validation",
        );
      return tx.coreCommitteeSelectionInterview.create({
        data: {
          ...input,
          status: input.scheduledAt ? "SCHEDULED" : "PLANNED",
          scheduledByUserId: input.actorUserId,
        },
      });
    });
  }
  async completeInterview(input: {
    selectionId: string;
    interviewId: string;
    candidateAttended: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "INTERVIEWS");
      const updated = await tx.coreCommitteeSelectionInterview.updateMany({
        where: {
          id: input.interviewId,
          selectionId: input.selectionId,
          status: { in: ["PLANNED", "SCHEDULED"] },
        },
        data: {
          status: "COMPLETED",
          candidateAttended: input.candidateAttended,
          completedAt: new Date(),
        },
      });
      if (updated.count !== 1)
        throw new CoreCommitteeSelectionError(
          "Interview not found or already completed",
          "notFound",
        );
      return { interviewId: input.interviewId };
    });
  }
  async currentCouncilCommittee(selectionId: string, userId: string) {
    const selection = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id: selectionId },
      select: { academicYear: true },
    });
    if (!selection)
      throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    const membership = await this.prisma.committeeMembership.findFirst({
      where: {
        userId,
        isActive: true,
        committee: {
          type: "STUDENT_COUNCIL",
          status: "ACTIVE",
          academicYear: selection.academicYear,
        },
      },
      select: { committeeId: true },
    });
    return membership?.committeeId ?? null;
  }
  async recordCouncilReview(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    councilCommitteeId: string;
    councilMemberUserId: string;
    note: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "COUNCIL_REVIEW");
      const current = await this.currentCouncilCommittee(
        input.selectionId,
        input.councilMemberUserId,
      );
      if (current !== input.councilCommitteeId)
        throw new CoreCommitteeSelectionError(
          "Only an active current Council member may record a review",
        );
      return tx.coreCommitteeCouncilReview.upsert({
        where: {
          candidateId_positionId_councilMemberUserId: {
            candidateId: input.candidateId,
            positionId: input.positionId,
            councilMemberUserId: input.councilMemberUserId,
          },
        },
        create: input,
        update: { note: input.note, councilCommitteeId: input.councilCommitteeId },
      });
    });
  }
  async recordDecision(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    councilCommitteeId: string;
    councilMemberUserId: string;
    outcome: "SELECTED" | "NOT_SELECTED";
    internalNote: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireStage(tx, input.selectionId, "COUNCIL_REVIEW");
      const current = await this.currentCouncilCommittee(
        input.selectionId,
        input.councilMemberUserId,
      );
      if (current !== input.councilCommitteeId)
        throw new CoreCommitteeSelectionError(
          "Only an active current Council member may record a decision",
        );
      const existing = await tx.coreCommitteeSelectionDecision.findUnique({
        where: {
          candidateId_positionId: { candidateId: input.candidateId, positionId: input.positionId },
        },
      });
      if (existing?.state === "FINALIZED")
        throw new CoreCommitteeSelectionError("Finalized decisions are immutable");
      const data = {
        selectionId: input.selectionId,
        candidateId: input.candidateId,
        positionId: input.positionId,
        councilCommitteeId: input.councilCommitteeId,
        outcome: input.outcome,
        internalNote: input.internalNote,
        decidedByUserId: input.councilMemberUserId,
        decidedAt: new Date(),
      };
      return existing
        ? tx.coreCommitteeSelectionDecision.update({ where: { id: existing.id }, data })
        : tx.coreCommitteeSelectionDecision.create({ data });
    });
  }
  async finalizeDecision(input: { selectionId: string; decisionId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.status !== "COUNCIL_REVIEW" && selection.status !== "SELECTION_DECIDED")
        throw new CoreCommitteeSelectionError(
          "Decisions can only be finalized during Council review or selection decision",
        );
      const updated = await tx.coreCommitteeSelectionDecision.updateMany({
        where: { id: input.decisionId, selectionId: input.selectionId, state: "RECORDED" },
        data: { state: "FINALIZED", finalizedByUserId: input.actorUserId, finalizedAt: new Date() },
      });
      if (updated.count !== 1)
        throw new CoreCommitteeSelectionError(
          "Decision not found or already finalized",
          "notFound",
        );
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_DECISION_FINALIZED,
        targetEntityType: "CoreCommitteeSelectionDecision",
        targetEntityId: input.decisionId,
      });
      return { decisionId: input.decisionId };
    });
  }
  async processing(selectionId: string, applicantUserId?: string) {
    const selection = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id: selectionId },
      include: {
        candidates: {
          where: { applicantUserId },
          include: {
            positions: { include: { position: true } },
            scrutinyReviews: true,
            correctionRequests: true,
            shortlistEntries: true,
            interviews: true,
            councilReviews: true,
            decisions: true,
          },
        },
        positions: true,
      },
    });
    if (!selection)
      throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    return { candidates: selection.candidates, positions: selection.positions };
  }
}
export async function associateCoreCommitteeSelectionCandidate(
  tx: PrismaTypes.TransactionClient,
  input: {
    formId: string;
    applicationId: string;
    applicantUserId: string;
    coreCommitteeSelectionPositionIds?: readonly string[];
  },
) {
  const link = await tx.coreCommitteeSelectionApplicationForm.findUnique({
    where: { formId: input.formId },
  });
  if (!link) {
    if (input.coreCommitteeSelectionPositionIds?.length)
      throw new CoreCommitteeSelectionError(
        "This form is not associated with a Core Committee selection",
        "validation",
      );
    return;
  }
  await tx.$queryRaw`SELECT "id" FROM "core_committee_selections" WHERE "id" = ${link.selectionId}::uuid FOR UPDATE`;
  const selection = await tx.coreCommitteeSelection.findUnique({
    where: { id: link.selectionId },
    include: { applicationForm: true, positions: true },
  });
  const application = await tx.formApplication.findUnique({
    where: { id: input.applicationId },
    include: { submission: true },
  });
  if (
    !selection ||
    selection.applicationForm?.formId !== input.formId ||
    !application ||
    application.submission.formId !== input.formId ||
    application.submission.applicantUserId !== input.applicantUserId
  )
    throw new CoreCommitteeSelectionError("Selection/form association changed; refresh and retry");
  const positionIds = input.coreCommitteeSelectionPositionIds ?? [];
  const existing = await tx.coreCommitteeSelectionCandidate.findUnique({
    where: {
      selectionId_applicantUserId: {
        selectionId: selection.id,
        applicantUserId: input.applicantUserId,
      },
    },
    include: { positions: true },
  });
  if (existing) {
    if (
      existing.applicationId === input.applicationId &&
      existing.positions.length === positionIds.length &&
      existing.positions.every((item) => positionIds.includes(item.positionId))
    )
      return;
    throw new CoreCommitteeSelectionError(
      "A Core Committee candidacy already exists for this selection",
    );
  }
  const now = new Date();
  if (
    selection.status !== "APPLICATION_OPEN" ||
    now < selection.applicationOpenAt ||
    now >= selection.applicationCloseAt
  )
    throw new CoreCommitteeSelectionError("Core Committee applications are not open");
  const eligible = await tx.$queryRaw<
    { id: string }[]
  >`SELECT u."id" FROM "users" u JOIN "student_profiles" s ON s."userId" = u."id" WHERE u."id" = ${input.applicantUserId}::uuid AND u."role" = 'STUDENT' AND u."isActive" = true AND s."isActive" = true AND s."id" = ${application.submission.studentProfileId}::uuid FOR SHARE OF u, s`;
  if (!eligible.length)
    throw new CoreCommitteeSelectionError("Only active students may apply", "validation");
  if (
    !positionIds.length ||
    positionIds.length > selection.maxPositionsPerCandidate ||
    new Set(positionIds).size !== positionIds.length ||
    positionIds.some((id) => !selection.positions.some((position) => position.id === id))
  )
    throw new CoreCommitteeSelectionError(
      "Select valid, distinct Core Committee positions within the configured limit",
      "validation",
    );
  const candidate = await tx.coreCommitteeSelectionCandidate.create({
    data: {
      selectionId: selection.id,
      applicationId: application.id,
      applicantUserId: input.applicantUserId,
      positions: {
        create: positionIds.map((positionId) => ({
          position: { connect: { id_selectionId: { id: positionId, selectionId: selection.id } } },
        })),
      },
    },
  });
  await new PrismaAuditRecorder(tx).record({
    actorUserId: input.applicantUserId,
    action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_CANDIDATE_CREATED,
    targetEntityType: "CoreCommitteeSelectionCandidate",
    targetEntityId: candidate.id,
    metadata: { selectionId: selection.id, applicationId: application.id },
  });
}
