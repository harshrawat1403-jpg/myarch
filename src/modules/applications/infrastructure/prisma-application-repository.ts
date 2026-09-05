import { Prisma, type PrismaClient } from "@prisma/client";
import { isFormAvailable } from "@/modules/forms/domain/lifecycle";
import type { FormStatus } from "@/modules/forms/domain/entities";
import type {
  ApplicationFilters,
  FormApplicationDetail,
  FormApplicationRecord,
  FormApplicationReviewRecord,
  FormApplicationReviewerRecord,
  FormApplicationStatus,
  FormApplicationStatusEventRecord,
  FormApplicationSummary,
} from "../domain/entities";
import type { ApplicationRepository, CreateFormApplicationData } from "../application/ports/application-repository";
import { ApplicationAlreadyDecidedError, DuplicateFormApplicationError, FormApplicationNotFoundError, FormNotAvailableError, InvalidFormApplicationTransitionError, ReviewerAlreadyAssignedError } from "../domain/errors";

type ApplicationWithRelations = Prisma.FormApplicationGetPayload<{
  include: {
    submission: { include: { form: { include: { fields: true; electionApplicationForm: true } }; applicant: true; studentProfile: true } };
    reviewers: true;
    reviews: true;
    statusEvents: true;
  };
}>;

type ApplicationRow = Prisma.FormApplicationGetPayload<{
  include: { submission: { include: { form: { include: { electionApplicationForm: true } }; applicant: true; studentProfile: true } } };
}>;

export class PrismaFormApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient, private readonly associateCandidate?: (tx: Prisma.TransactionClient, input: { formId: string; applicationId: string; applicantUserId: string; electionPositionIds?: readonly string[]; coreCommitteeSelectionPositionIds?: readonly string[] }) => Promise<void>) {}

  async createSubmitted(data: CreateFormApplicationData): Promise<FormApplicationRecord> {
    let applicationId: string;
    try {
      applicationId = await this.prisma.$transaction(async (tx) => {
        const formRows = await tx.$queryRaw<Array<{ status: string; deadline: Date | null }>>`
          SELECT "status", "deadline"
          FROM "forms"
          WHERE "id" = ${data.formId}::uuid
          FOR UPDATE
        `;
        const form = formRows[0];
        if (!form || !isFormAvailable({ status: form.status as FormStatus, deadline: form.deadline })) throw new FormNotAvailableError();

        const submission = await tx.formSubmission.create({
          data: {
            formId: data.formId,
            applicantUserId: data.applicantUserId,
            studentProfileId: data.studentProfileId,
            answers: { ...data.answers } as Prisma.InputJsonObject,
          },
        });
        const application = await tx.formApplication.create({
          data: {
            submissionId: submission.id,
            statusEvents: { create: { toStatus: "SUBMITTED", changedByUserId: data.actorUserId } },
          },
        });
        await this.associateCandidate?.(tx, { formId: data.formId, applicationId: application.id, applicantUserId: data.applicantUserId, electionPositionIds: data.electionPositionIds, coreCommitteeSelectionPositionIds: data.coreCommitteeSelectionPositionIds });
        return application.id;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new DuplicateFormApplicationError();
      throw error;
    }
    const application = await this.findById(applicationId);
    if (!application) throw new Error("Created form application could not be loaded");
    return toRecord(application);
  }

  async findById(id: string): Promise<FormApplicationDetail | null> {
    const row = await this.prisma.formApplication.findUnique({
      where: { id },
      include: {
        submission: {
          include: {
            form: { include: { fields: { orderBy: { displayOrder: "asc" } }, electionApplicationForm: true } },
            applicant: true,
            studentProfile: true,
          },
        },
        reviewers: { orderBy: { assignedAt: "asc" } },
        reviews: { orderBy: { createdAt: "asc" } },
        statusEvents: { orderBy: { occurredAt: "asc" } },
      },
    });
    return row ? toDetail(row) : null;
  }

  async findByApplicantAndForm(applicantUserId: string, formId: string): Promise<FormApplicationRecord | null> {
    const row = await this.prisma.formApplication.findFirst({
      where: { submission: { applicantUserId, formId } },
      include: { submission: { include: { form: { include: { electionApplicationForm: true } }, applicant: true, studentProfile: true } } },
    });
    return row ? toRecordFromRow(row) : null;
  }

  async listForApplicant(applicantUserId: string): Promise<readonly FormApplicationSummary[]> {
    const rows = await this.prisma.formApplication.findMany({
      where: { submission: { applicantUserId } },
      include: { submission: { include: { form: { include: { electionApplicationForm: true } }, applicant: true, studentProfile: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSummaryFromRow);
  }

  async search(filters: ApplicationFilters): Promise<readonly FormApplicationSummary[]> {
    const rows = await this.prisma.formApplication.findMany({
      where: {
        currentStatus: filters.status,
        submission: {
          formId: filters.formId,
          ...(filters.reviewerUserId
            ? { reviewers: { some: { reviewerUserId: filters.reviewerUserId, unassignedAt: null } } }
            : {}),
        },
      },
      include: { submission: { include: { form: { include: { electionApplicationForm: true } }, applicant: true, studentProfile: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSummaryFromRow);
  }

  async assignReviewer(applicationId: string, reviewerUserId: string, assignedByUserId: string): Promise<FormApplicationReviewerRecord> {
    return this.prisma.$transaction(async (tx) => {
      const applicationRows = await tx.$queryRaw<Array<{ currentStatus: string }>>`
        SELECT "currentStatus"
        FROM "form_applications"
        WHERE "id" = ${applicationId}::uuid
        FOR UPDATE
      `;
      const application = applicationRows[0];
      if (!application) throw new FormApplicationNotFoundError();
      if (application.currentStatus === "SELECTED" || application.currentStatus === "REJECTED") throw new ApplicationAlreadyDecidedError();

      const existing = await tx.formApplicationReviewer.findFirst({
        where: { applicationId, reviewerUserId, unassignedAt: null },
      });
      if (existing) throw new ReviewerAlreadyAssignedError();

      const row = await tx.formApplicationReviewer.create({
        data: { applicationId, reviewerUserId, assignedByUserId },
      });
      return toReviewer(row);
    });
  }

  async findActiveReviewer(applicationId: string, reviewerUserId: string): Promise<FormApplicationReviewerRecord | null> {
    const row = await this.prisma.formApplicationReviewer.findFirst({
      where: { applicationId, reviewerUserId, unassignedAt: null },
    });
    return row ? toReviewer(row) : null;
  }

  async listReviewers(applicationId: string): Promise<readonly FormApplicationReviewerRecord[]> {
    const rows = await this.prisma.formApplicationReviewer.findMany({ where: { applicationId }, orderBy: { assignedAt: "asc" } });
    return rows.map(toReviewer);
  }

  async recordReview(input: {
    applicationId: string;
    reviewerUserId: string;
    notes: string;
    fromStatus: Extract<FormApplicationStatus, "SUBMITTED" | "UNDER_REVIEW">;
    changedByUserId: string;
  }): Promise<{ application: FormApplicationRecord; review: FormApplicationReviewRecord }> {
    const review = await this.prisma.$transaction(async (tx) => {
      if (input.fromStatus === "SUBMITTED") {
        const result = await tx.formApplication.updateMany({
          where: { id: input.applicationId, currentStatus: "SUBMITTED" },
          data: { currentStatus: "UNDER_REVIEW", updatedAt: new Date() },
        });
        if (result.count !== 1) throw new InvalidFormApplicationTransitionError("SUBMITTED", "UNDER_REVIEW");
        await tx.formApplicationStatusEvent.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: "SUBMITTED",
            toStatus: "UNDER_REVIEW",
            changedByUserId: input.changedByUserId,
          },
        });
      } else {
        const result = await tx.formApplication.updateMany({
          where: { id: input.applicationId, currentStatus: "UNDER_REVIEW" },
          data: { updatedAt: new Date() },
        });
        if (result.count !== 1) throw new InvalidFormApplicationTransitionError("UNDER_REVIEW", "REVIEW");
      }

      return tx.formApplicationReview.create({
        data: { applicationId: input.applicationId, reviewerUserId: input.reviewerUserId, notes: input.notes },
      });
    });
    const application = await this.findById(input.applicationId);
    if (!application) throw new Error("Reviewed form application could not be loaded");
    return { application: toRecord(application), review: toReview(review) };
  }

  async transitionStatus(input: {
    applicationId: string;
    fromStatus: FormApplicationStatus;
    toStatus: FormApplicationStatus;
    changedByUserId: string;
    note?: string | null;
    decisionReason?: string | null;
  }): Promise<FormApplicationRecord> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.formApplication.updateMany({
        where: { id: input.applicationId, currentStatus: input.fromStatus },
        data: {
          currentStatus: input.toStatus,
          ...(input.decisionReason !== undefined ? { decisionReason: input.decisionReason, decidedByUserId: input.changedByUserId, decidedAt: new Date() } : {}),
        },
      });
      if (result.count !== 1) throw new Error("Form application status changed concurrently");
      await tx.formApplicationStatusEvent.create({
        data: {
          applicationId: input.applicationId,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          note: input.note ?? null,
          changedByUserId: input.changedByUserId,
        },
      });
    });
    const application = await this.findById(input.applicationId);
    if (!application) throw new Error("Updated form application could not be loaded");
    return toRecord(application);
  }

  async listStatusEvents(applicationId: string): Promise<readonly FormApplicationStatusEventRecord[]> {
    const rows = await this.prisma.formApplicationStatusEvent.findMany({ where: { applicationId }, orderBy: { occurredAt: "asc" } });
    return rows.map(toStatusEvent);
  }
}

function toRecord(detail: FormApplicationDetail): FormApplicationRecord {
  return {
    id: detail.id,
    submissionId: detail.submissionId,
    formId: detail.formId,
    applicantUserId: detail.applicantUserId,
    studentProfileId: detail.studentProfileId,
    currentStatus: detail.currentStatus,
    decisionReason: detail.decisionReason,
    decidedByUserId: detail.decidedByUserId,
    decidedAt: detail.decidedAt,
    submittedAt: detail.submittedAt,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

function toRecordFromRow(row: ApplicationRow): FormApplicationRecord {
  return {
    id: row.id,
    submissionId: row.submissionId,
    electionId: row.submission.form.electionApplicationForm?.electionId ?? null,
    formId: row.submission.formId,
    applicantUserId: row.submission.applicantUserId,
    studentProfileId: row.submission.studentProfileId,
    currentStatus: row.currentStatus,
    decisionReason: row.decisionReason,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    submittedAt: row.submission.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSummaryFromRow(row: ApplicationRow): FormApplicationSummary {
  return {
    ...toRecordFromRow(row),
    formTitle: row.submission.form.title,
    applicantName: row.submission.studentProfile.fullName,
    applicantBatchId: row.submission.studentProfile.batchId,
  };
}

function toDetail(row: ApplicationWithRelations): FormApplicationDetail {
  return {
    ...toRecordFromRow(row),
    formTitle: row.submission.form.title,
    fields: row.submission.form.fields.map((field) => ({
      id: field.id,
      formId: field.formId,
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description,
      required: field.required,
      options: Array.isArray(field.options) ? field.options.filter((value): value is string => typeof value === "string") : [],
      validation: isValidation(field.validation) ? field.validation : null,
      displayOrder: field.displayOrder,
    })),
    answers: isRecord(row.submission.answers) ? row.submission.answers : {},
    applicantName: row.submission.studentProfile.fullName,
    applicantBatchId: row.submission.studentProfile.batchId,
    reviewers: row.reviewers.map(toReviewer),
    reviews: row.reviews.map(toReview),
    statusEvents: row.statusEvents.map(toStatusEvent),
  };
}

function toReviewer(row: { id: string; applicationId: string; reviewerUserId: string; assignedByUserId: string; assignedAt: Date; unassignedAt: Date | null }): FormApplicationReviewerRecord {
  return { id: row.id, applicationId: row.applicationId, reviewerUserId: row.reviewerUserId, assignedByUserId: row.assignedByUserId, assignedAt: row.assignedAt, unassignedAt: row.unassignedAt };
}

function toReview(row: { id: string; applicationId: string; reviewerUserId: string; notes: string; createdAt: Date }): FormApplicationReviewRecord {
  return { id: row.id, applicationId: row.applicationId, reviewerUserId: row.reviewerUserId, notes: row.notes, createdAt: row.createdAt };
}

function toStatusEvent(row: { id: string; applicationId: string; fromStatus: FormApplicationStatus | null; toStatus: FormApplicationStatus; note: string | null; changedByUserId: string; occurredAt: Date }): FormApplicationStatusEventRecord {
  return { id: row.id, applicationId: row.applicationId, fromStatus: row.fromStatus, toStatus: row.toStatus, note: row.note, changedByUserId: row.changedByUserId, occurredAt: row.occurredAt };
}

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidation(value: Prisma.JsonValue | null): value is Prisma.JsonObject & { min?: number; max?: number } {
  if (!isRecord(value)) return false;
  return (value.min === undefined || typeof value.min === "number") && (value.max === undefined || typeof value.max === "number");
}
