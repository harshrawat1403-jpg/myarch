import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { resolveNotificationDestination } from "../../../src/modules/notifications/application/templates/destinations";
import { AssignReviewerUseCase } from "../../../src/modules/applications/application/use-cases/assign-reviewer";
import { DecideApplicationUseCase } from "../../../src/modules/applications/application/use-cases/decide-application";
import { GetApplicationUseCase } from "../../../src/modules/applications/application/use-cases/get-application";
import { GetMyApplicationUseCase } from "../../../src/modules/applications/application/use-cases/get-my-application";
import { RecordReviewUseCase } from "../../../src/modules/applications/application/use-cases/record-review";
import { PrismaFormApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";
import { ApplicationAlreadyDecidedError, DuplicateFormApplicationError, FormNotAvailableError, InvalidFormApplicationTransitionError, ReviewerAlreadyAssignedError } from "../../../src/modules/applications/domain/errors";
import type { FormApplicationDetail, FormApplicationRecord, FormApplicationReviewRecord } from "../../../src/modules/applications/domain/entities";
import { PrismaFormRepository } from "../../../src/modules/forms/infrastructure/prisma-form-repository";
import { PublishedFormImmutableError } from "../../../src/modules/forms/domain/errors";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const secretary: AuthenticatedActor = { userId: "secretary-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "student-1", role: "STUDENT", studentProfileId: "profile-1" };
const otherStudent: AuthenticatedActor = { userId: "student-2", role: "STUDENT", studentProfileId: "profile-2" };
const coordinator: AuthenticatedActor = {
  userId: "coordinator-1",
  role: "COORDINATOR",
  batchScope: ["batch-1"],
  permissions: ["applications.view", "applications.review"],
};

function application(status: FormApplicationDetail["currentStatus"] = "UNDER_REVIEW"): FormApplicationDetail {
  const now = new Date();
  return {
    id: "application-1",
    submissionId: "submission-1",
    electionId: null,
    selectionId: null,
    formId: "form-1",
    applicantUserId: student.userId,
    studentProfileId: student.studentProfileId!,
    currentStatus: status,
    decisionReason: status === "SELECTED" || status === "REJECTED" ? "Decision" : null,
    decidedByUserId: status === "SELECTED" || status === "REJECTED" ? secretary.userId : null,
    decidedAt: status === "SELECTED" || status === "REJECTED" ? now : null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    formTitle: "Council intake",
    fields: [],
    answers: { motivation: "Because" },
    applicantName: "Student One",
    applicantBatchId: "batch-1",
    reviewers: [],
    reviews: [],
    statusEvents: [],
  };
}

function record(detail: FormApplicationDetail): FormApplicationRecord {
  const { formTitle: _formTitle, fields: _fields, answers: _answers, applicantName: _applicantName, applicantBatchId: _applicantBatchId, reviewers: _reviewers, reviews: _reviews, statusEvents: _statusEvents, ...value } = detail;
  return value;
}

function reviewRecord(): FormApplicationReviewRecord {
  return { id: "review-1", applicationId: "application-1", reviewerUserId: secretary.userId, notes: "Reviewed", createdAt: new Date() };
}

describe("Phase 5 application integrity", () => {
  it.each(["SELECTED", "REJECTED"] as const)("rejects reviews after %s decisions", async (status) => {
    const repository = {
      findById: vi.fn().mockResolvedValue(application(status)),
      findActiveReviewer: vi.fn(),
      recordReview: vi.fn(),
    };
    const useCase = new RecordReviewUseCase({
      applicationRepository: repository as never,
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    await expect(useCase.execute({ actor: secretary, applicationId: "application-1", notes: "Late review" }))
      .rejects.toBeInstanceOf(InvalidFormApplicationTransitionError);
    expect(repository.recordReview).not.toHaveBeenCalled();
  });

  it("delegates the first review and status transition as one repository operation", async () => {
    const current = application("SUBMITTED");
    const updated = record({ ...current, currentStatus: "UNDER_REVIEW" });
    const repository = {
      findById: vi.fn().mockResolvedValue(current),
      findActiveReviewer: vi.fn(),
      recordReview: vi.fn().mockResolvedValue({ application: updated, review: reviewRecord() }),
    };
    const useCase = new RecordReviewUseCase({
      applicationRepository: repository as never,
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    await useCase.execute({ actor: secretary, applicationId: "application-1", notes: "Reviewed" });

    expect(repository.recordReview).toHaveBeenCalledOnce();
    expect(repository.recordReview).toHaveBeenCalledWith(expect.objectContaining({ fromStatus: "SUBMITTED" }));
  });

  it.each(["SELECTED", "REJECTED"] as const)("rejects reviewer assignment after %s decisions", async (status) => {
    const repository = { findById: vi.fn().mockResolvedValue(application(status)) };
    const useCase = new AssignReviewerUseCase({
      applicationRepository: repository as never,
      reviewerLookup: { findByUserId: vi.fn() },
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    await expect(useCase.execute({ actor: secretary, applicationId: "application-1", reviewerUserId: "reviewer-1" }))
      .rejects.toBeInstanceOf(ApplicationAlreadyDecidedError);
  });

  it("preserves the intentional Secretary supervisory review override", () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(application("UNDER_REVIEW")),
      findActiveReviewer: vi.fn(),
      recordReview: vi.fn().mockResolvedValue({ application: record(application()), review: reviewRecord() }),
    };
    const useCase = new RecordReviewUseCase({
      applicationRepository: repository as never,
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    return expect(useCase.execute({ actor: secretary, applicationId: "application-1", notes: "Secretary review" })).resolves.toBeDefined();
  });

  it.each([
    { electionId: "election-1", selectionId: null },
    { electionId: null, selectionId: "selection-1" },
  ])("blocks generic review actions for governance applications %#", async (association) => {
    const current = { ...application(), ...association };
    const repository = {
      findById: vi.fn().mockResolvedValue(current),
      findActiveReviewer: vi.fn(),
      assignReviewer: vi.fn(),
      recordReview: vi.fn(),
      transitionStatus: vi.fn(),
    };
    const auditRecorder = new FakeAuditRecorder();
    const notificationService = new FakeNotificationService();
    const assign = new AssignReviewerUseCase({
      applicationRepository: repository as never,
      reviewerLookup: { findByUserId: vi.fn() },
      auditRecorder,
      notificationService,
    });
    const review = new RecordReviewUseCase({ applicationRepository: repository as never, auditRecorder, notificationService });
    const decide = new DecideApplicationUseCase({ applicationRepository: repository as never, auditRecorder, notificationService });

    await expect(assign.execute({ actor: secretary, applicationId: current.id, reviewerUserId: "reviewer-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(review.execute({ actor: secretary, applicationId: current.id, notes: "Review" })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(decide.execute({ actor: secretary, applicationId: current.id, status: "SELECTED" })).rejects.toBeInstanceOf(NotAuthorizedError);
    expect(repository.assignReviewer).not.toHaveBeenCalled();
    expect(repository.recordReview).not.toHaveBeenCalled();
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });

  it("prevents a student from viewing another student's application", async () => {
    const useCase = new GetMyApplicationUseCase({ applicationRepository: { findById: vi.fn().mockResolvedValue(application()) } as never });

    await expect(useCase.execute({ actor: otherStudent, applicationId: "application-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("requires both coordinator permissions, batch scope, and assignment for details", async () => {
    const current = application();
    const repository = { findById: vi.fn().mockResolvedValue(current) };
    const useCase = new GetApplicationUseCase({ applicationRepository: repository as never });
    const assigned = { ...current, reviewers: [{ id: "assignment-1", applicationId: current.id, reviewerUserId: coordinator.userId, assignedByUserId: secretary.userId, assignedAt: new Date(), unassignedAt: null }] };

    await expect(useCase.execute({ actor: coordinator, applicationId: current.id })).rejects.toBeInstanceOf(NotAuthorizedError);
    repository.findById.mockResolvedValue({ ...assigned, applicantBatchId: "batch-2" });
    await expect(useCase.execute({ actor: coordinator, applicationId: current.id })).rejects.toBeInstanceOf(NotAuthorizedError);
    repository.findById.mockResolvedValue(assigned);
    await expect(useCase.execute({ actor: { ...coordinator, permissions: ["applications.review"] }, applicationId: current.id })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(useCase.execute({ actor: { ...coordinator, permissions: ["applications.view"] }, applicationId: current.id })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("allows only the Secretary to make a final decision", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(application()),
      transitionStatus: vi.fn().mockResolvedValue(record({ ...application(), currentStatus: "SELECTED" })),
    };
    const useCase = new DecideApplicationUseCase({
      applicationRepository: repository as never,
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    await expect(useCase.execute({ actor: coordinator, applicationId: "application-1", status: "SELECTED" })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(useCase.execute({ actor: secretary, applicationId: "application-1", status: "SELECTED" })).resolves.toBeDefined();
  });

  it("does not expose reviewer notes in the student view", async () => {
    const current = { ...application(), reviews: [reviewRecord()], statusEvents: [{ id: "event-1", applicationId: "application-1", fromStatus: null, toStatus: "SUBMITTED" as const, note: "private", changedByUserId: secretary.userId, occurredAt: new Date() }] };
    const useCase = new GetMyApplicationUseCase({ applicationRepository: { findById: vi.fn().mockResolvedValue(current) } as never });
    const view = await useCase.execute({ actor: student, applicationId: "application-1" });

    expect(view).not.toHaveProperty("reviews");
    expect(view.statusEvents[0]).not.toHaveProperty("note");
  });
});

describe("Phase 5 repository consistency", () => {
  it("conditionally updates draft forms and refuses a published-form race", async () => {
    const tx = {
      form: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn() },
      formField: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = new PrismaFormRepository(prisma as never);

    await expect(repository.update("form-1", { title: "Changed" })).rejects.toBeInstanceOf(PublishedFormImmutableError);
    expect(tx.form.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "form-1", status: "DRAFT" } }));
    expect(tx.formField.deleteMany).not.toHaveBeenCalled();
  });

  it("rechecks form availability while holding the form row lock", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ status: "CLOSED", deadline: null }]),
      formSubmission: { create: vi.fn() },
      formApplication: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = new PrismaFormApplicationRepository(prisma as never);

    await expect(repository.createSubmitted({ formId: "form-1", applicantUserId: "student-1", studentProfileId: "profile-1", answers: {}, actorUserId: "student-1" }))
      .rejects.toBeInstanceOf(FormNotAvailableError);
    expect(tx.formSubmission.create).not.toHaveBeenCalled();
  });

  it("maps a concurrent submission unique violation to the domain duplicate error", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.3.1" });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ status: "PUBLISHED", deadline: null }]),
      formSubmission: { create: vi.fn().mockRejectedValue(duplicate) },
      formApplication: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = new PrismaFormApplicationRepository(prisma as never);

    await expect(repository.createSubmitted({ formId: "form-1", applicantUserId: "student-1", studentProfileId: "profile-1", answers: {}, actorUserId: "student-1" }))
      .rejects.toBeInstanceOf(DuplicateFormApplicationError);
  });

  it("locks an application row before rejecting a duplicate active reviewer assignment", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ currentStatus: "UNDER_REVIEW" }]),
      formApplicationReviewer: {
        findFirst: vi.fn().mockResolvedValue({ id: "assignment-1", applicationId: "application-1", reviewerUserId: "reviewer-1", assignedByUserId: "secretary-1", assignedAt: new Date(), unassignedAt: null }),
        create: vi.fn(),
      },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = new PrismaFormApplicationRepository(prisma as never);

    await expect(repository.assignReviewer("application-1", "reviewer-1", secretary.userId)).rejects.toBeInstanceOf(ReviewerAlreadyAssignedError);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.formApplicationReviewer.create).not.toHaveBeenCalled();
  });

  it("serializes concurrent reviewer assignments for the same application", async () => {
    let assignmentExists = false;
    let transactionTail = Promise.resolve();
    const assignment = { id: "assignment-1", applicationId: "application-1", reviewerUserId: "reviewer-1", assignedByUserId: secretary.userId, assignedAt: new Date(), unassignedAt: null };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ currentStatus: "UNDER_REVIEW" }]),
      formApplicationReviewer: {
        findFirst: vi.fn().mockImplementation(async () => assignmentExists ? assignment : null),
        create: vi.fn().mockImplementation(async () => { assignmentExists = true; return assignment; }),
      },
    };
    const prisma = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
        let release!: () => void;
        const previous = transactionTail;
        transactionTail = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        try { return await callback(tx); } finally { release(); }
      },
    };
    const repository = new PrismaFormApplicationRepository(prisma as never);

    const results = await Promise.allSettled([
      repository.assignReviewer("application-1", "reviewer-1", secretary.userId),
      repository.assignReviewer("application-1", "reviewer-1", secretary.userId),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected" && result.reason instanceof ReviewerAlreadyAssignedError)).toHaveLength(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe("Phase 5 notification destinations", () => {
  it("uses the existing role-appropriate form application pages", () => {
    expect(resolveNotificationDestination("FORM_SUBMITTED", {})).toBe("/dashboard/form-applications");
    expect(resolveNotificationDestination("FORM_APPLICATION_REVIEWER_ASSIGNED", {})).toBe("/dashboard/form-applications");
    expect(resolveNotificationDestination("FORM_APPLICATION_UNDER_REVIEW", {})).toBe("/student/form-applications");
    expect(resolveNotificationDestination("FORM_APPLICATION_DECIDED", {})).toBe("/student/form-applications");
  });
});
