import {
  Prisma,
  type CoreCommitteeSelectionQuestion as PrismaCoreQuestion,
  type PrismaClient,
  type Prisma as PrismaTypes,
} from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import {
  CoreCommitteeSelectionError,
  assertSelectionDraft,
  assertSelectionTransition,
  validateCoreCommitteeAnswers,
} from "../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionConfig,
  CoreCommitteeSelectionPositionConfig,
  CoreCommitteeSelectionStatus,
  CoreCommitteeSelectionQuestionConfig,
} from "../domain/core-committee-selection";
import type {
  CoreCommitteeSelectionCandidateRecord,
  CoreCommitteeSelectionRecord,
  StudentCoreCommitteeInterview,
  StudentCoreCommitteeSelectionDetail,
  StudentCoreCommitteeApplicationField,
  StudentCoreCommitteeResult,
  StudentCoreCommitteeSelectionSummary,
} from "../domain/entities";
import type {
  CoreCommitteeSelectionCouncilProcessingDTO,
  CoreCommitteeSelectionRepository,
} from "../application/ports/core-committee-selection-repository";

const selectionInclude = {
  publication: { select: { publishedAt: true } },
  positions: {
    orderBy: { displayOrder: "asc" as const },
    include: { questions: { orderBy: { displayOrder: "asc" as const } } },
  },
  applicationForm: {
    include: { form: { include: { fields: { orderBy: { displayOrder: "asc" as const } } } } },
  },
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
    brief: row.brief,
    academicYear: row.academicYear,
    status: row.status,
    finalResultsPublishedAt: row.publication?.publishedAt ?? null,
    applicationOpenAt: row.applicationOpenAt,
    applicationCloseAt: row.applicationCloseAt,
    shortlistPublishedAt: row.shortlistPublishedAt,
    correctionOpenAt: row.correctionOpenAt,
    correctionCloseAt: row.correctionCloseAt,
    maxPositionsPerCandidate: 1,
    configurationLockedAt: row.configurationLockedAt,
    createdAt: row.createdAt,
    positions: row.positions.map((position) => ({
      id: position.id,
      title: position.title,
      description: position.description,
      seats: position.seats,
      displayOrder: position.displayOrder,
      questions: position.questions.map(toStudentField),
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

type StudentCandidateRow = {
  status: CoreCommitteeSelectionCandidateRecord["status"];
  positions: Array<{ position: { id: string; title: string } }>;
  application: { submission: { submittedAt: Date; answers: PrismaTypes.JsonValue } };
  interviews: Array<{
    id: string;
    positionId: string;
    scheduledAt: Date | null;
    durationMinutes: number | null;
    mode: string | null;
    location: string | null;
    candidateInstructions: string | null;
    status: "PLANNED" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
    completedAt: Date | null;
  }>;
  decisions: Array<{ outcome: "SELECTED" | "NOT_SELECTED" }>;
};
type StudentSummaryRow = {
  id: string;
  title: string;
  brief: string;
  status: CoreCommitteeSelectionStatus;
  applicationOpenAt: Date;
  applicationCloseAt: Date;
  shortlistPublishedAt: Date | null;
  candidates: StudentCandidateRow[];
  publication: { publishedAt: Date } | null;
};

function studentInterview(
  interview: StudentCandidateRow["interviews"][number],
): StudentCoreCommitteeInterview {
  return {
    id: interview.id,
    positionId: interview.positionId,
    scheduledAt: interview.scheduledAt,
    durationMinutes: interview.durationMinutes,
    mode: interview.mode,
    location: interview.location,
    candidateInstructions: interview.candidateInstructions,
    status: interview.status,
    completedAt: interview.completedAt,
  };
}

function studentResult(
  candidate: StudentCandidateRow,
  publication: { publishedAt: Date } | null,
): StudentCoreCommitteeResult | null {
  if (!publication) return null;
  if (!candidate.decisions.length) return null;
  return {
    outcome: candidate.decisions.some((decision) => decision.outcome === "SELECTED")
      ? "SELECTED"
      : "NOT_SELECTED",
    publishedAt: publication.publishedAt,
  };
}

function candidateDomain(candidate: StudentCandidateRow) {
  const domain = candidate.positions[0]?.position;
  if (!domain)
    throw new CoreCommitteeSelectionError(
      "Core Committee application is missing its selected domain",
    );
  return { id: domain.id, title: domain.title };
}

function toStudentSummary(row: StudentSummaryRow): StudentCoreCommitteeSelectionSummary {
  const candidate = row.candidates[0] ?? null;
  const visibleStatus =
    candidate && !row.shortlistPublishedAt && ["INELIGIBLE", "SHORTLISTED"].includes(candidate.status)
      ? "APPLIED"
      : candidate?.status;
  return {
    id: row.id,
    title: row.title,
    brief: row.brief,
    status: row.status,
    applicationOpenAt: row.applicationOpenAt,
    applicationCloseAt: row.applicationCloseAt,
    shortlistPublishedAt: row.shortlistPublishedAt,
    application: candidate
      ? {
          status: visibleStatus ?? "APPLIED",
          submittedAt: candidate.application.submission.submittedAt,
          domain: candidateDomain(candidate),
          interviews: candidate.interviews.map(studentInterview),
          result: studentResult(candidate, row.publication),
          shortlistOutcome:
            row.shortlistPublishedAt === null
              ? null
              : candidate.status === "SHORTLISTED"
                ? "SHORTLISTED"
                : "NOT_SHORTLISTED",
        }
      : null,
  };
}

function toStudentField(field: PrismaCoreQuestion): StudentCoreCommitteeApplicationField {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    description: field.description,
    required: field.required,
    options: Array.isArray(field.options)
      ? field.options.filter((value): value is string => typeof value === "string")
      : [],
    validation: toFieldValidation(field.validation),
    displayOrder: field.displayOrder,
  };
}

function toFieldValidation(
  value: PrismaTypes.JsonValue | null,
): StudentCoreCommitteeApplicationField["validation"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    (record.min !== undefined && typeof record.min !== "number") ||
    (record.max !== undefined && typeof record.max !== "number")
  )
    return null;
  return {
    ...(typeof record.min === "number" ? { min: record.min } : {}),
    ...(typeof record.max === "number" ? { max: record.max } : {}),
  };
}

function toAnswers(value: PrismaTypes.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function toQuestionCreate(field: CoreCommitteeSelectionQuestionConfig) {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    description: field.description ?? null,
    required: field.required,
    options: field.options.length ? [...field.options] : undefined,
    validation: field.validation ?? undefined,
    displayOrder: field.displayOrder,
  };
}
function toQuestionConfig(question: PrismaCoreQuestion): CoreCommitteeSelectionQuestionConfig {
  return {
    key: question.key,
    label: question.label,
    type: question.type,
    description: question.description,
    required: question.required,
    options: Array.isArray(question.options)
      ? question.options.filter((value): value is string => typeof value === "string")
      : [],
    validation: toFieldValidation(question.validation),
    displayOrder: question.displayOrder,
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
  async listForStudent(studentUserId: string): Promise<StudentCoreCommitteeSelectionSummary[]> {
    const rows = await this.prisma.coreCommitteeSelection.findMany({
      where: { status: { not: "DRAFT" } },
      include: {
        publication: { select: { publishedAt: true } },
        candidates: {
          where: { applicantUserId: studentUserId },
          include: {
            positions: {
              include: {
                position: { include: { questions: { orderBy: { displayOrder: "asc" as const } } } },
              },
            },
            application: { include: { submission: true } },
            interviews: true,
            decisions: { select: { outcome: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => toStudentSummary(row));
  }
  async getForStudent(
    id: string,
    studentUserId: string,
  ): Promise<StudentCoreCommitteeSelectionDetail | null> {
    const row = await this.prisma.coreCommitteeSelection.findFirst({
      where: { id, status: { not: "DRAFT" } },
      include: {
        positions: {
          orderBy: { displayOrder: "asc" },
          include: { questions: { orderBy: { displayOrder: "asc" } } },
        },
        applicationForm: {
          include: { form: { include: { fields: { orderBy: { displayOrder: "asc" } } } } },
        },
        publication: { select: { publishedAt: true } },
        candidates: {
          where: { applicantUserId: studentUserId },
          include: {
            positions: {
              include: {
                position: { include: { questions: { orderBy: { displayOrder: "asc" as const } } } },
              },
            },
            application: { include: { submission: true } },
            interviews: true,
            decisions: { select: { outcome: true } },
          },
        },
      },
    });
    if (!row) return null;
    const candidate = row.candidates[0] ?? null;
    const base = toStudentSummary(row);
    return {
      ...base,
      positions: row.positions.map((position) => ({
        id: position.id,
        title: position.title,
        description: position.description,
        seats: position.seats,
        displayOrder: position.displayOrder,
        questions: position.questions.map(toStudentField),
      })),
      fields: candidate
        ? (row.positions
            .find((position) => position.id === candidate.positions[0]?.position.id)
            ?.questions.map(toStudentField) ?? [])
        : [],
      application: candidate
        ? {
            status: base.application?.status ?? "APPLIED",
            submittedAt: candidate.application.submission.submittedAt,
            domain: candidateDomain(candidate),
            answers: toAnswers(candidate.application.submission.answers),
            interviews: candidate.interviews.map(studentInterview),
            result: studentResult(candidate, row.publication),
            shortlistOutcome:
              row.shortlistPublishedAt === null
                ? null
                : candidate.status === "SHORTLISTED"
                  ? "SHORTLISTED"
                  : "NOT_SHORTLISTED",
          }
        : null,
    };
  }
  async getStudentApplicationFormId(selectionId: string): Promise<string | null> {
    const selection = await this.prisma.coreCommitteeSelection.findFirst({
      where: { id: selectionId, status: { not: "DRAFT" } },
      select: { applicationForm: { select: { formId: true } } },
    });
    return selection?.applicationForm?.formId ?? null;
  }
  async create(config: CoreCommitteeSelectionConfig, actorUserId: string) {
    const row = await this.prisma.coreCommitteeSelection.create({
      data: {
        ...config,
        maxPositionsPerCandidate: 1,
        createdByUserId: actorUserId,
        applicationForm: {
          create: {
            managedForm: true,
            form: {
              create: {
                title: config.title,
                description: config.brief,
                deadline: config.applicationCloseAt,
                createdByUserId: actorUserId,
              },
            },
          },
        },
      },
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
      if (current.applicationForm?.managedForm)
        await tx.form.update({
          where: { id: current.applicationForm.formId },
          data: {
            title: config.title,
            description: config.brief,
            deadline: config.applicationCloseAt,
          },
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
  async extendDeadline(input: { selectionId: string; newClosingDate: Date; actorUserId: string }) {
    const row = await this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.status !== "APPLICATION_OPEN")
        throw new CoreCommitteeSelectionError(
          "The application deadline may only be extended while applications are open",
          "validation",
        );
      if (
        input.newClosingDate <= selection.applicationCloseAt ||
        input.newClosingDate <= selection.applicationOpenAt
      )
        throw new CoreCommitteeSelectionError(
          "The new closing date must be later than the current closing date",
          "validation",
        );
      await tx.coreCommitteeSelectionDeadlineExtension.create({
        data: {
          selectionId: selection.id,
          previousClosingDate: selection.applicationCloseAt,
          newClosingDate: input.newClosingDate,
          extendedByUserId: input.actorUserId,
        },
      });
      if (selection.applicationForm?.managedForm)
        await tx.form.update({
          where: { id: selection.applicationForm.formId },
          data: { deadline: input.newClosingDate },
        });
      return tx.coreCommitteeSelection.update({
        where: { id: selection.id },
        data: { applicationCloseAt: input.newClosingDate },
        include: selectionInclude,
      });
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
      const { questions, ...positionConfig } = config;
      const data = { ...positionConfig, identityKey: identityKey(config.title) };
      let savedPositionId = positionId;
      if (positionId) {
        const result = await tx.coreCommitteeSelectionPosition.updateMany({
          where: { id: positionId, selectionId },
          data,
        });
        if (result.count !== 1)
          throw new CoreCommitteeSelectionError("Selection position not found", "notFound");
      } else {
        const created = await tx.coreCommitteeSelectionPosition.create({
          data: { selectionId, ...data },
        });
        savedPositionId = created.id;
      }
      if (!savedPositionId)
        throw new CoreCommitteeSelectionError("Selection position could not be saved");
      await tx.coreCommitteeSelectionQuestion.deleteMany({
        where: { selectionId, positionId: savedPositionId },
      });
      if (questions?.length)
        await tx.coreCommitteeSelectionQuestion.createMany({
          data: questions.map((question) => ({
            ...toQuestionCreate(question),
            selectionId,
            positionId: savedPositionId,
          })),
        });
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
        if (!selection.applicationForm || !selection.positions.length)
          throw new CoreCommitteeSelectionError(
            "Opening requires at least one domain",
            "validation",
          );
        const now = new Date();
        if (now < selection.applicationOpenAt || now >= selection.applicationCloseAt)
          throw new CoreCommitteeSelectionError(
            "Application window is not currently open",
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
      if (status === "APPLICATION_OPEN" && selection.applicationForm?.managedForm)
        await tx.form.update({
          where: { id: selection.applicationForm.formId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            deadline: selection.applicationCloseAt,
          },
        });
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
        positions: {
          include: {
            position: { include: { questions: { orderBy: { displayOrder: "asc" as const } } } },
          },
        },
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
  async recordScrutiny(input: {
    selectionId: string;
    candidateId: string;
    decision: "ELIGIBLE" | "INELIGIBLE" | "CORRECTION_REQUIRED";
    reason: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
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
    shortlisted?: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      const candidate = await tx.coreCommitteeSelectionCandidate.findUnique({
        where: { id_selectionId: { id: input.candidateId, selectionId: input.selectionId } },
        include: { positions: true },
      });
      if (!candidate || candidate.status === "WITHDRAWN")
        throw new CoreCommitteeSelectionError(
          "Candidate not found or withdrawn",
          "validation",
        );
      const valid = new Set(candidate.positions.map((position) => position.positionId));
      if (!input.positionIds.length || input.positionIds.some((id) => !valid.has(id)))
        throw new CoreCommitteeSelectionError(
          "Select positions applied for by this candidate",
          "validation",
        );
      if (input.shortlisted === false) {
        await tx.coreCommitteeSelectionShortlistEntry.deleteMany({
          where: { selectionId: input.selectionId, candidateId: input.candidateId },
        });
      } else {
        await tx.coreCommitteeSelectionShortlistEntry.createMany({
          data: input.positionIds.map((positionId) => ({
            selectionId: input.selectionId,
            candidateId: input.candidateId,
            positionId,
            shortlistedByUserId: input.actorUserId,
          })),
          skipDuplicates: true,
        });
      }
      await tx.coreCommitteeSelectionCandidate.update({
        where: { id: input.candidateId },
        data: { status: input.shortlisted === false ? "INELIGIBLE" : "SHORTLISTED" },
      });
      return {
        candidateId: input.candidateId,
        candidateUserId: candidate.applicantUserId,
        selectionTitle: selection.title,
      };
    });
  }
  async publishShortlist(input: { selectionId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.shortlistPublishedAt)
        return { published: true as const, idempotent: true };
      const candidates = await tx.coreCommitteeSelectionCandidate.findMany({
        where: { selectionId: selection.id, status: { in: ["SHORTLISTED", "INELIGIBLE"] } },
        select: { applicantUserId: true, status: true },
      });
      if (!candidates.length)
        throw new CoreCommitteeSelectionError(
          "Record at least one shortlist decision before publishing",
          "validation",
        );
      await tx.coreCommitteeSelection.update({
        where: { id: selection.id },
        data: { shortlistPublishedAt: new Date() },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_STATUS_CHANGED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selection.id,
        metadata: { event: "SHORTLIST_PUBLISHED" },
      });
      return {
        published: true as const,
        idempotent: false,
        notificationRecipients: {
          candidateUserIds: candidates.map((candidate) => candidate.applicantUserId),
          shortlistedCandidateUserIds: candidates
            .filter((candidate) => candidate.status === "SHORTLISTED")
            .map((candidate) => candidate.applicantUserId),
          notShortlistedCandidateUserIds: candidates
            .filter((candidate) => candidate.status === "INELIGIBLE")
            .map((candidate) => candidate.applicantUserId),
          selectionId: selection.id,
          selectionTitle: selection.title,
        },
      };
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
    candidateInstructions?: string;
    internalNotes?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
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
      const candidate = await tx.coreCommitteeSelectionCandidate.findFirst({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          status: "SHORTLISTED",
        },
        select: { applicantUserId: true },
      });
      if (!candidate)
        throw new CoreCommitteeSelectionError(
          "Only shortlisted candidates may be scheduled",
          "validation",
        );
      const activeInterview = await tx.coreCommitteeSelectionInterview.findFirst({
        where: {
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          status: { in: ["PLANNED", "SCHEDULED"] },
        },
      });
      if (activeInterview)
        throw new CoreCommitteeSelectionError(
          "This candidate already has an active interview",
          "conflict",
        );
      const interview = await tx.coreCommitteeSelectionInterview.create({
        data: {
          selectionId: input.selectionId,
          candidateId: input.candidateId,
          positionId: input.positionId,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          mode: input.mode,
          location: input.location,
          candidateInstructions: input.candidateInstructions,
          internalNotes: input.internalNotes,
          status: "SCHEDULED",
          scheduledByUserId: input.actorUserId,
        },
      });
      return {
        interviewId: interview.id,
        candidateUserId: candidate.applicantUserId,
        selectionTitle: selection.title,
      };
    });
  }
  async rescheduleInterview(input: {
    selectionId: string;
    interviewId: string;
    scheduledAt: Date;
    durationMinutes?: number;
    mode?: string;
    location?: string;
    candidateInstructions?: string;
    internalNotes?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.coreCommitteeSelectionInterview.findFirst({
        where: { id: input.interviewId, selectionId: input.selectionId, status: "SCHEDULED" },
        include: {
          candidate: { select: { applicantUserId: true } },
          selection: { select: { title: true } },
        },
      });
      if (!existing)
        throw new CoreCommitteeSelectionError(
          "Only a scheduled interview may be rescheduled",
          "validation",
        );
      await tx.coreCommitteeSelectionInterviewHistory.create({
        data: {
          interviewId: existing.id,
          selectionId: input.selectionId,
          previousScheduledAt: existing.scheduledAt,
          newScheduledAt: input.scheduledAt,
          previousDurationMinutes: existing.durationMinutes,
          newDurationMinutes: input.durationMinutes,
          previousMode: existing.mode,
          newMode: input.mode,
          previousLocation: existing.location,
          newLocation: input.location,
          previousStatus: existing.status,
          newStatus: "SCHEDULED",
          changedByUserId: input.actorUserId,
        },
      });
      await tx.coreCommitteeSelectionInterview.update({
        where: { id: existing.id },
        data: {
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          mode: input.mode,
          location: input.location,
          candidateInstructions: input.candidateInstructions,
          internalNotes: input.internalNotes,
        },
      });
      return {
        interviewId: existing.id,
        candidateUserId: existing.candidate.applicantUserId,
        selectionTitle: existing.selection.title,
      };
    });
  }
  async cancelInterview(input: {
    selectionId: string;
    interviewId: string;
    reason?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.coreCommitteeSelectionInterview.findFirst({
        where: {
          id: input.interviewId,
          selectionId: input.selectionId,
          status: { in: ["PLANNED", "SCHEDULED"] },
        },
        include: {
          candidate: { select: { applicantUserId: true } },
          selection: { select: { title: true } },
        },
      });
      if (!existing)
        throw new CoreCommitteeSelectionError(
          "Interview not found or cannot be cancelled",
          "notFound",
        );
      await tx.coreCommitteeSelectionInterviewHistory.create({
        data: {
          interviewId: existing.id,
          selectionId: input.selectionId,
          previousScheduledAt: existing.scheduledAt,
          newScheduledAt: existing.scheduledAt,
          previousDurationMinutes: existing.durationMinutes,
          newDurationMinutes: existing.durationMinutes,
          previousMode: existing.mode,
          newMode: existing.mode,
          previousLocation: existing.location,
          newLocation: existing.location,
          previousStatus: existing.status,
          newStatus: "CANCELLED",
          changedByUserId: input.actorUserId,
        },
      });
      await tx.coreCommitteeSelectionInterview.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledByUserId: input.actorUserId,
          cancellationReason: input.reason,
        },
      });
      return {
        interviewId: existing.id,
        candidateUserId: existing.candidate.applicantUserId,
        selectionTitle: existing.selection.title,
      };
    });
  }
  async completeInterview(input: {
    selectionId: string;
    interviewId: string;
    candidateAttended: boolean;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
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
      const current = await this.currentCouncilCommittee(
        input.selectionId,
        input.councilMemberUserId,
      );
      if (current !== input.councilCommitteeId)
        throw new CoreCommitteeSelectionError(
          "Only an active current Council member may record a review",
        );
      const review = await tx.coreCommitteeCouncilReview.upsert({
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
      return {
        id: review.id,
        candidateId: review.candidateId,
        positionId: review.positionId,
        createdAt: review.createdAt,
      };
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
    return this.serializable(async (tx) => {
      const lockedSelection = await lockSelection(tx, input.selectionId);
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
      const eligible = await tx.coreCommitteeSelectionCandidate.findFirst({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          status: { in: ["ELIGIBLE", "SHORTLISTED"] },
          positions: { some: { positionId: input.positionId } },
        },
      });
      if (!eligible)
        throw new CoreCommitteeSelectionError(
          "Decision candidate is not eligible for this Core Committee position",
          "validation",
        );
      if (input.outcome === "SELECTED" && existing?.outcome !== "SELECTED") {
        const position = lockedSelection.positions.find((item) => item.id === input.positionId);
        if (!position)
          throw new CoreCommitteeSelectionError("Core Committee domain not found", "notFound");
        const selected = await tx.coreCommitteeSelectionDecision.count({
          where: {
            selectionId: input.selectionId,
            positionId: input.positionId,
            outcome: "SELECTED",
          },
        });
        if (selected >= position.seats)
          throw new CoreCommitteeSelectionError(
            "This Core Committee domain has reached its final selection capacity",
            "validation",
          );
      }
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
      const decision = existing
        ? tx.coreCommitteeSelectionDecision.update({ where: { id: existing.id }, data })
        : tx.coreCommitteeSelectionDecision.create({ data });
      const persisted = await decision;
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.councilMemberUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_DECISION_RECORDED,
        targetEntityType: "CoreCommitteeSelectionDecision",
        targetEntityId: persisted.id,
      });
      return {
        id: persisted.id,
        candidateId: persisted.candidateId,
        positionId: persisted.positionId,
        outcome: persisted.outcome,
        state: persisted.state,
        decidedAt: persisted.decidedAt,
        finalizedAt: persisted.finalizedAt,
      };
    });
  }
  async recordSecretaryDecision(input: {
    selectionId: string;
    candidateId: string;
    positionId: string;
    outcome: "SELECTED" | "NOT_SELECTED";
    actorUserId: string;
  }) {
    return this.serializable(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.publication)
        throw new CoreCommitteeSelectionError("Published results cannot be changed", "validation");
      const candidate = await tx.coreCommitteeSelectionCandidate.findFirst({
        where: {
          id: input.candidateId,
          selectionId: input.selectionId,
          status: "SHORTLISTED",
          positions: { some: { positionId: input.positionId } },
          shortlistEntries: { some: { positionId: input.positionId, selectionId: input.selectionId } },
        },
      });
      if (!candidate)
        throw new CoreCommitteeSelectionError("Candidate not found for this Core Committee position", "notFound");
      const position = selection.positions.find((item) => item.id === input.positionId);
      if (!position) throw new CoreCommitteeSelectionError("Core Committee domain not found", "notFound");
      const existing = await tx.coreCommitteeSelectionDecision.findUnique({
        where: { candidateId_positionId: { candidateId: input.candidateId, positionId: input.positionId } },
      });
      if (input.outcome === "SELECTED" && existing?.outcome !== "SELECTED") {
        const selected = await tx.coreCommitteeSelectionDecision.count({
          where: { selectionId: input.selectionId, positionId: input.positionId, outcome: "SELECTED" },
        });
        if (selected >= position.seats)
          throw new CoreCommitteeSelectionError(
            `Selected candidates exceed available seats for ${position.title}`,
            "validation",
          );
      }
      const data = {
        councilCommitteeId: existing?.councilCommitteeId ?? null,
        outcome: input.outcome,
        internalNote: "Secretary final result",
        decidedByUserId: input.actorUserId,
        decidedAt: new Date(),
        state: "FINALIZED" as const,
        finalizedByUserId: input.actorUserId,
        finalizedAt: new Date(),
      };
      const decision = existing
        ? await tx.coreCommitteeSelectionDecision.update({
            where: { id: existing.id },
            data,
          })
        : await tx.coreCommitteeSelectionDecision.create({
            data: {
              selectionId: input.selectionId,
              candidateId: input.candidateId,
              positionId: input.positionId,
              ...data,
            },
          });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_DECISION_RECORDED,
        targetEntityType: "CoreCommitteeSelectionDecision",
        targetEntityId: decision.id,
      });
      return decision;
    });
  }
  async finalizeDecision(input: { selectionId: string; decisionId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
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
  private async serializable<T>(
    work: (tx: PrismaTypes.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          ...options,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" ||
            (error.code === "P2010" && error.message.includes("Code: `40001`")));
        if (!retryable || attempt === 2) throw error;
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    throw lastError;
  }
  private async finalizedSelection(tx: PrismaTypes.TransactionClient, selectionId: string) {
    const selection = await lockSelection(tx, selectionId);
    const decisions = await tx.coreCommitteeSelectionDecision.findMany({
      where: { selectionId, state: "FINALIZED" },
      include: { position: true, candidate: { include: { positions: true } } },
    });
    if (!decisions.length)
      throw new CoreCommitteeSelectionError(
        "Record at least one final Core Committee decision before publishing",
        "validation",
      );
    const selected = decisions.filter((decision) => decision.outcome === "SELECTED");
    for (const position of selection.positions) {
      if (
        selected.filter((decision) => decision.positionId === position.id).length > position.seats
      )
        throw new CoreCommitteeSelectionError(
          `Selected candidates exceed available seats for ${position.title}`,
          "validation",
        );
    }
    if (
      selected.some(
        (decision) =>
          (decision.candidate.status !== "ELIGIBLE" &&
            decision.candidate.status !== "SHORTLISTED") ||
          !decision.candidate.positions.some((item) => item.positionId === decision.positionId),
      )
    )
      throw new CoreCommitteeSelectionError(
        "Only eligible candidates for the selected position may be appointed",
        "validation",
      );
    return { selection, decisions, selected };
  }
  async publishedResults(selectionId: string) {
    const selection = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id: selectionId },
      include: {
        publication: true,
        decisions: {
          where: { outcome: "SELECTED", state: "FINALIZED" },
          include: {
            position: true,
            candidate: { include: { applicant: { include: { studentProfile: true } } } },
          },
        },
      },
    });
    if (!selection || !selection.publication)
      throw new CoreCommitteeSelectionError("Core Committee results are not published", "notFound");
    return {
      title: selection.title,
      academicYear: selection.academicYear,
      publishedAt: selection.publication.publishedAt,
      positions: selection.decisions.map((decision) => ({
        positionTitle: decision.position.title,
        selectedMember:
          decision.candidate.applicant.studentProfile?.fullName ??
          decision.candidate.applicant.email,
      })),
    };
  }
  async publish(input: { selectionId: string; actorUserId: string }) {
    return this.serializable(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.publication)
        return { published: true as const, idempotent: true };
      const { decisions, selected } = await this.finalizedSelection(tx, selection.id);
      const candidates = await tx.coreCommitteeSelectionCandidate.findMany({
        where: { selectionId: selection.id },
        select: { applicantUserId: true },
      });
      const publication = await tx.coreCommitteeSelectionPublication.upsert({
        where: { selectionId: selection.id },
        create: { selectionId: selection.id, publishedByUserId: input.actorUserId },
        update: {},
      });
      await tx.coreCommitteeSelection.update({
        where: { id: selection.id },
        data: { status: "PUBLISHED" },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_RESULT_PUBLISHED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selection.id,
      });
      return {
        published: true as const,
        idempotent: false,
        publication,
        notificationRecipients: {
          selectionId: selection.id,
          selectionTitle: selection.title,
          candidateUserIds: candidates.map((candidate) => candidate.applicantUserId),
          selectedCandidateUserIds: selected.map((decision) => decision.candidate.applicantUserId),
          notSelectedCandidateUserIds: decisions
            .filter((decision) => decision.outcome === "NOT_SELECTED")
            .map((decision) => decision.candidate.applicantUserId),
        },
      };
    });
  }
  async appointmentPreview(selectionId: string) {
    return this.serializable(async (tx) => {
      const { selection, selected } = await this.finalizedSelection(tx, selectionId);
      if (selection.status !== "PUBLISHED")
        throw new CoreCommitteeSelectionError(
          "Core Committee appointments require published results",
          "validation",
        );
      const currentCommittee = await tx.committee.findFirst({
        where: { type: "CORE_COMMITTEE", academicYear: selection.academicYear, status: "ACTIVE" },
      });
      const memberships = currentCommittee
        ? await tx.committeeMembership.findMany({
            where: { committeeId: currentCommittee.id, isActive: true },
            include: {
              user: {
                select: { id: true, email: true, studentProfile: { select: { fullName: true } } },
              },
            },
          })
        : [];
      return {
        academicYear: selection.academicYear,
        currentCoreCommittee: { committee: currentCommittee, memberships },
        selected: selected.map((decision) => ({
          decisionId: decision.id,
          candidateId: decision.candidateId,
          positionId: decision.positionId,
          userId: decision.candidate.applicantUserId,
          position: decision.position.title,
          candidateName: decision.candidate.applicantUserId,
        })),
      };
    });
  }
  async confirmAppointments(input: { selectionId: string; actorUserId: string }) {
    return this.serializable(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.status === "MEMBERSHIP_CONFIRMED")
        return { confirmed: true as const, idempotent: true };
      if (selection.status !== "PUBLISHED")
        throw new CoreCommitteeSelectionError(
          "Core Committee appointments require published results",
          "validation",
        );
      const { selected } = await this.finalizedSelection(tx, selection.id);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`core-committee:${selection.academicYear}`}))`;
      if (
        await tx.coreCommitteeSelectionAppointment.count({ where: { selectionId: selection.id } })
      )
        throw new CoreCommitteeSelectionError(
          "Core Committee appointments already exist",
          "conflict",
        );
      let committee = await tx.committee.findFirst({
        where: { type: "CORE_COMMITTEE", academicYear: selection.academicYear, status: "ACTIVE" },
      });
      if (!committee)
        committee = await tx.committee.create({
          data: {
            name: `Core Committee ${selection.academicYear}`,
            type: "CORE_COMMITTEE",
            academicYear: selection.academicYear,
            startDate: new Date(),
          },
        });
      const now = new Date();
      const outgoing = await tx.committeeMembership.updateMany({
        where: { committeeId: committee.id, isActive: true },
        data: { isActive: false, endDate: now },
      });
      for (const decision of selected) {
        const membership = await tx.committeeMembership.create({
          data: {
            committeeId: committee.id,
            userId: decision.candidate.applicantUserId,
            position: decision.position.title,
            academicYear: selection.academicYear,
            startDate: now,
            isActive: true,
          },
        });
        await tx.coreCommitteeSelectionAppointment.create({
          data: {
            selectionId: selection.id,
            decisionId: decision.id,
            candidateId: decision.candidateId,
            positionId: decision.positionId,
            committeeId: committee.id,
            membershipId: membership.id,
            appointedUserId: decision.candidate.applicantUserId,
            confirmedByUserId: input.actorUserId,
          },
        });
      }
      await tx.coreCommitteeSelection.update({
        where: { id: selection.id },
        data: { status: "MEMBERSHIP_CONFIRMED" },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_APPOINTMENTS_CONFIRMED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selection.id,
        metadata: {
          committeeId: committee.id,
          outgoingMembershipCount: outgoing.count,
          appointmentCount: selected.length,
        },
      });
      return {
        confirmed: true as const,
        idempotent: false,
        committeeId: committee.id,
        appointmentCount: selected.length,
        notificationRecipients: {
          selectionId: selection.id,
          selectionTitle: selection.title,
          selectedCandidateUserIds: selected.map((decision) => decision.candidate.applicantUserId),
        },
      };
    });
  }
  async archive(input: { selectionId: string; actorUserId: string }) {
    return this.serializable(async (tx) => {
      const selection = await lockSelection(tx, input.selectionId);
      if (selection.status !== "MEMBERSHIP_CONFIRMED")
        throw new CoreCommitteeSelectionError(
          "Core Committee selection may be archived only after membership confirmation",
          "validation",
        );
      await tx.coreCommitteeSelection.update({
        where: { id: selection.id },
        data: { status: "ARCHIVED" },
      });
      await new PrismaAuditRecorder(tx).record({
        actorUserId: input.actorUserId,
        action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_ARCHIVED,
        targetEntityType: "CoreCommitteeSelection",
        targetEntityId: selection.id,
      });
      return { archived: true };
    });
  }
  async delete(input: {
    selectionId: string;
    actorUserId: string;
    confirmation: string | undefined;
  }) {
    return this.serializable(
      async (tx) => {
        const selection = await lockSelection(tx, input.selectionId);
        if (selection.status === "MEMBERSHIP_CONFIRMED" || selection.status === "ARCHIVED")
          throw new CoreCommitteeSelectionError(
            "A membership-confirmed Core Committee selection cannot be permanently deleted because it would break governance history",
            "validation",
          );

        const [applications, shortlisted, interviews] = await Promise.all([
          tx.coreCommitteeSelectionCandidate.count({ where: { selectionId: selection.id } }),
          tx.coreCommitteeSelectionShortlistEntry.count({ where: { selectionId: selection.id } }),
          tx.coreCommitteeSelectionInterview.count({ where: { selectionId: selection.id } }),
        ]);
        if (
          (selection.status !== "DRAFT" || applications > 0) &&
          input.confirmation !== "DELETE CORE SELECTION"
        )
          throw new CoreCommitteeSelectionError(
            "Type DELETE CORE SELECTION to permanently delete this Core Committee application",
            "validation",
          );

        const candidateIds = (
          await tx.coreCommitteeSelectionCandidate.findMany({
            where: { selectionId: selection.id },
            select: { id: true, applicationId: true },
          })
        ).map((candidate) => candidate.id);
        const interviewIds = (
          await tx.coreCommitteeSelectionInterview.findMany({
            where: { selectionId: selection.id },
            select: { id: true },
          })
        ).map((interview) => interview.id);

        if (interviewIds.length)
          await tx.coreCommitteeSelectionInterviewHistory.deleteMany({
            where: { interviewId: { in: interviewIds } },
          });
        await tx.coreCommitteeSelectionInterview.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionShortlistEntry.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeCouncilReview.deleteMany({ where: { selectionId: selection.id } });
        await tx.coreCommitteeSelectionDecision.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionCorrectionRequest.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionScrutinyReview.deleteMany({
          where: { selectionId: selection.id },
        });
        if (candidateIds.length)
          await tx.coreCommitteeSelectionCandidatePosition.deleteMany({
            where: { candidateId: { in: candidateIds } },
          });
        await tx.coreCommitteeSelectionCandidate.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionDeadlineExtension.deleteMany({
          where: { selectionId: selection.id },
        });
        // The database trigger accepts this transaction-local escape hatch only
        // for the explicitly authorized, confirmed permanent-delete workflow.
        // PostgreSQL clears it automatically on commit or rollback.
        await tx.$executeRaw`SELECT set_config('myarch.allow_core_publication_delete', 'on', true)`;
        await tx.coreCommitteeSelectionPublication.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionQuestion.deleteMany({
          where: { selectionId: selection.id },
        });
        await tx.coreCommitteeSelectionPosition.deleteMany({
          where: { selectionId: selection.id },
        });

        const ownedFormId = selection.applicationForm?.managedForm
          ? selection.applicationForm.formId
          : null;
        await tx.coreCommitteeSelectionApplicationForm.deleteMany({
          where: { selectionId: selection.id },
        });
        // Candidate rows above release the governance relation; the owned form
        // then cascades only its own submissions and FormApplication rows.
        if (ownedFormId) await tx.form.delete({ where: { id: ownedFormId } });
        await tx.coreCommitteeSelection.delete({ where: { id: selection.id } });
        await new PrismaAuditRecorder(tx).record({
          actorUserId: input.actorUserId,
          action: AUDIT_ACTIONS.CORE_COMMITTEE_SELECTION_DELETED,
          targetEntityType: "CoreCommitteeSelection",
          targetEntityId: selection.id,
          metadata: {
            title: selection.title,
            lifecycleState: selection.status,
            applications,
            interviews,
          },
        });
        return { applications, shortlisted, interviews };
      },
      {
        // A populated Core selection performs a bounded, database-only cascade
        // of explicit Restrict-FK deletes. Neon/Vercel pool acquisition and that
        // sequence can exceed Prisma's 2s/5s interactive defaults; keep the
        // exception local to destructive cleanup rather than relaxing every
        // governance transaction.
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  }
  async internalProcessing(selectionId: string) {
    const selection = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id: selectionId },
      include: {
        applicationForm: {
          include: { form: { include: { fields: { orderBy: { displayOrder: "asc" as const } } } } },
        },
        candidates: {
          include: {
            applicant: { include: { studentProfile: true } },
            application: { include: { submission: { include: { studentProfile: true } } } },
            positions: {
              include: {
                position: { include: { questions: { orderBy: { displayOrder: "asc" as const } } } },
              },
            },
            scrutinyReviews: true,
            correctionRequests: true,
            shortlistEntries: true,
            interviews: true,
            councilReviews: true,
            decisions: true,
          },
        },
        positions: { include: { questions: { orderBy: { displayOrder: "asc" as const } } } },
      },
    });
    if (!selection)
      throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    return {
      positions: selection.positions.map(({ id, title, seats, displayOrder }) => ({
        id,
        title,
        seats,
        displayOrder,
      })),
      candidates: selection.candidates.map((candidate) => ({
        ...candidate,
        candidateName: candidate.applicant.studentProfile?.fullName ?? candidate.applicant.email,
        rollNumber: candidate.application.submission.studentProfile?.rollNumber ?? null,
        submittedAt: candidate.application.submission.submittedAt,
        answers: candidate.application.submission.answers,
        applicationStatus: candidate.application.currentStatus,
        positions: candidate.positions.map(({ positionId, position }) => ({
          positionId,
          title: position.title,
        })),
        questions: candidate.positions[0]?.position.questions.map(toStudentField) ?? [],
        shortlist: candidate.shortlistEntries.map(({ positionId, createdAt }) => ({
          positionId,
          createdAt,
        })),
      })),
    };
  }
  async councilProcessing(
    selectionId: string,
  ): Promise<CoreCommitteeSelectionCouncilProcessingDTO> {
    const selection = await this.prisma.coreCommitteeSelection.findUnique({
      where: { id: selectionId },
      select: {
        applicationForm: {
          select: {
            form: {
              select: {
                fields: {
                  orderBy: { displayOrder: "asc" },
                  select: {
                    key: true,
                    label: true,
                    type: true,
                    description: true,
                    required: true,
                    options: true,
                    validation: true,
                    displayOrder: true,
                  },
                },
              },
            },
          },
        },
        positions: { select: { id: true, title: true, seats: true, displayOrder: true } },
        candidates: {
          select: {
            id: true,
            applicantUserId: true,
            status: true,
            application: {
              select: {
                id: true,
                currentStatus: true,
                submission: {
                  select: {
                    answers: true,
                    submittedAt: true,
                    studentProfile: { select: { rollNumber: true } },
                  },
                },
              },
            },
            applicant: { select: { studentProfile: { select: { fullName: true } }, email: true } },
            positions: { select: { positionId: true, position: { select: { title: true } } } },
            scrutinyReviews: { select: { decision: true, createdAt: true } },
            shortlistEntries: { select: { positionId: true, createdAt: true } },
            interviews: {
              select: {
                id: true,
                positionId: true,
                scheduledAt: true,
                durationMinutes: true,
                mode: true,
                location: true,
                candidateAttended: true,
                completedAt: true,
                status: true,
              },
            },
            decisions: {
              select: {
                positionId: true,
                outcome: true,
                state: true,
                decidedAt: true,
                finalizedAt: true,
              },
            },
          },
        },
      },
    });
    if (!selection)
      throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    return {
      positions: selection.positions,
      candidates: selection.candidates.map((candidate) => ({
        id: candidate.id,
        applicantUserId: candidate.applicantUserId,
        candidateName: candidate.applicant.studentProfile?.fullName ?? candidate.applicant.email,
        rollNumber: candidate.application.submission.studentProfile?.rollNumber ?? null,
        applicationId: candidate.application.id,
        submittedAt: candidate.application.submission.submittedAt,
        answers: candidate.application.submission.answers,
        applicationStatus: candidate.application.currentStatus,
        status: candidate.status,
        questions: [],
        positions: candidate.positions.map((position) => ({
          positionId: position.positionId,
          title: position.position.title,
        })),
        scrutiny: candidate.scrutinyReviews.map((review) => ({
          decision: review.decision,
          createdAt: review.createdAt,
        })),
        shortlist: candidate.shortlistEntries.map((entry) => ({
          positionId: entry.positionId,
          createdAt: entry.createdAt,
        })),
        interviews: candidate.interviews,
        decisions: candidate.decisions,
      })),
    };
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
    include: {
      applicationForm: true,
      positions: { include: { questions: { orderBy: { displayOrder: "asc" } } } },
    },
  });
  const application = await tx.formApplication.findUnique({
    where: { id: input.applicationId },
    include: { submission: true },
  });
  if (!selection)
    throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
  if (!application) throw new CoreCommitteeSelectionError("Application not found", "notFound");
  if (
    selection.applicationForm?.formId !== input.formId ||
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
  const selectedPosition = selection.positions.find((position) => position.id === positionIds[0]);
  if (!selectedPosition)
    throw new CoreCommitteeSelectionError(
      "Select exactly one valid Core Committee domain",
      "validation",
    );
  validateCoreCommitteeAnswers(
    selectedPosition.questions.map(toQuestionConfig),
    toAnswers(application.submission.answers),
  );
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
    positionIds.length !== 1 ||
    new Set(positionIds).size !== positionIds.length ||
    positionIds.some((id) => !selection.positions.some((position) => position.id === id))
  )
    throw new CoreCommitteeSelectionError(
      "Select exactly one valid Core Committee domain",
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
