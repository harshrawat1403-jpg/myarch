import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
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
    status: "APPLICATION_OPEN" | "APPLICATION_CLOSED",
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.electionApplicationForm.findUnique({ where: { electionId: id } });
      if (link)
        await tx.$queryRaw`SELECT "id" FROM "forms" WHERE "id" = ${link.formId}::uuid FOR UPDATE`;
      const row = await this.locked(tx, id);
      assertTransition(row.status, status);
      const now = new Date();
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
            : { status, closedAt: now },
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
}
