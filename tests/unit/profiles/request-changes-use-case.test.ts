import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { RequestChangesUseCase } from "../../../src/modules/profiles/application/use-cases/request-changes";
import {
  DraftNotFoundError,
  InvalidDraftTransitionError,
  MissingReviewCommentError,
} from "../../../src/modules/profiles/domain/errors";
import { StudentNotFoundError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const STUDENT_ID = "student-1";
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorInScope: AuthenticatedActor = {
  userId: "coord-1",
  role: "COORDINATOR",
  batchScope: ["batch-a"],
};
const coordinatorOutOfScope: AuthenticatedActor = {
  userId: "coord-2",
  role: "COORDINATOR",
  batchScope: ["batch-b"],
};
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };

function buildContext() {
  const draftRepository = new InMemoryProfileDraftRepository();
  const studentLookup = new InMemoryProfilesStudentLookup();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1", fullName: "Alice Architect" });

  const useCase = new RequestChangesUseCase({
    profileDraftRepository: draftRepository,
    studentLookup,
    auditRecorder,
    notificationService,
  });

  return { useCase, draftRepository, auditRecorder, notificationService };
}

describe("RequestChangesUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("moves a PENDING_REVIEW draft to CHANGES_REQUESTED, preserving the reviewer's comment", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    const updated = await ctx.useCase.execute({
      actor: secretary,
      studentId: STUDENT_ID,
      reviewComment: "Please add at least two portfolio projects.",
    });

    expect(updated.status).toBe("CHANGES_REQUESTED");
    expect(updated.reviewComment).toBe("Please add at least two portfolio projects.");
    expect(updated.reviewedByUserId).toBe("sec-1");
  });

  it("rejects an empty review comment", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "   " }),
    ).rejects.toBeInstanceOf(MissingReviewCommentError);
  });

  it("allows an in-scope Coordinator (V4.0 Q1: Coordinators retain review/request-changes authority, never approval)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    const updated = await ctx.useCase.execute({
      actor: coordinatorInScope,
      studentId: STUDENT_ID,
      reviewComment: "Add more portfolio detail.",
    });

    expect(updated.status).toBe("CHANGES_REQUESTED");
    expect(updated.reviewedByUserId).toBe("coord-1");
  });

  it("denies an out-of-scope Coordinator", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await expect(
      ctx.useCase.execute({ actor: coordinatorOutOfScope, studentId: STUDENT_ID, reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies the student from requesting changes on their own draft", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await expect(
      ctx.useCase.execute({ actor: owner, studentId: STUDENT_ID, reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects requesting changes on a draft still in DRAFT status (invalid transition)", async () => {
    await ctx.draftRepository.create(STUDENT_ID);
    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
  });

  it("rejects requesting changes on an already-APPROVED draft (invalid transition)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.transitionStatus(draft.id, { status: "APPROVED", reviewedAt: new Date() });

    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: "unknown", reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("throws DraftNotFoundError when no draft exists", async () => {
    ctx.draftRepository.seedStudentInfo(STUDENT_ID, { fullName: "X", batchId: "batch-a" });
    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" }),
    ).rejects.toBeInstanceOf(DraftNotFoundError);
  });

  it("records a PROFILE_CHANGES_REQUESTED audit entry with the comment in metadata", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix this" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        actorUserId: "sec-1",
        action: "PROFILE_CHANGES_REQUESTED",
        metadata: expect.objectContaining({ reviewComment: "fix this" }),
      }),
    );
  });

  it("notifies the student via NotificationService using the PROFILE_CHANGES_REQUESTED template", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix this" });

    expect(ctx.notificationService.sent).toContainEqual({
      recipientUserId: "user-1",
      template: "PROFILE_CHANGES_REQUESTED",
      context: { studentName: "Alice Architect", reviewComment: "fix this" },
    });
  });
});
