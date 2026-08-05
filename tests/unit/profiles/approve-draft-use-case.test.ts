import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ApproveDraftUseCase } from "../../../src/modules/profiles/application/use-cases/approve-draft";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../../src/modules/profiles/domain/errors";
import { StudentNotFoundError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { InMemoryPublishedProfileRepository } from "../../support/fakes/in-memory-published-profile-repository";
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
  const publishedProfileRepository = new InMemoryPublishedProfileRepository();
  const studentLookup = new InMemoryProfilesStudentLookup();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1", fullName: "Alice Architect" });

  const useCase = new ApproveDraftUseCase({
    profileDraftRepository: draftRepository,
    publishedProfileRepository,
    studentLookup,
    auditRecorder,
    notificationService,
  });

  return { useCase, draftRepository, publishedProfileRepository, studentLookup, auditRecorder, notificationService };
}

describe("ApproveDraftUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("approves a PENDING_REVIEW draft and publishes it", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(
      draft.id,
      { bio: "Talented architecture student", skills: ["Rendering"], software: ["Rhino"] },
      "PENDING_REVIEW",
    );

    const published = await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    expect(published.bio).toBe("Talented architecture student");
    expect(published.skills).toEqual(["Rendering"]);
    expect(published.software).toEqual(["Rhino"]);
    expect(published.publishedByUserId).toBe("sec-1");
  });

  it("sets the draft's own status to APPROVED", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });
    const reloaded = await ctx.draftRepository.findByStudentId(STUDENT_ID);
    expect(reloaded!.status).toBe("APPROVED");
    expect(reloaded!.reviewedByUserId).toBe("sec-1");
  });

  it("never includes any private-profile-shaped field in the published content (no leak)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "public bio" }, "PENDING_REVIEW");

    const published = await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    const publishedKeys = Object.keys(published);
    // These are StudentPrivateFields — must never appear on a published profile.
    expect(publishedKeys).not.toContain("cgpa");
    expect(publishedKeys).not.toContain("hasActiveBacklog");
    expect(publishedKeys).not.toContain("internalRemarks");
    expect(publishedKeys).not.toContain("phone");
    expect(publishedKeys).not.toContain("personalEmail");
  });

  it("allows an in-scope Coordinator to approve", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    const published = await ctx.useCase.execute({ actor: coordinatorInScope, studentId: STUDENT_ID });
    expect(published.publishedByUserId).toBe("coord-1");
  });

  it("denies an out-of-scope Coordinator (brief's named boundary)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await expect(
      ctx.useCase.execute({ actor: coordinatorOutOfScope, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies the student from approving their own draft", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await expect(ctx.useCase.execute({ actor: owner, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("rejects approving a draft still in DRAFT status (invalid transition)", async () => {
    await ctx.draftRepository.create(STUDENT_ID);
    await expect(ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      InvalidDraftTransitionError,
    );
  });

  it("rejects approving a draft in CHANGES_REQUESTED status (invalid transition)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.transitionStatus(draft.id, {
      status: "CHANGES_REQUESTED",
      reviewComment: "fix",
    });

    await expect(ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      InvalidDraftTransitionError,
    );
  });

  it("rejects approving an already-APPROVED draft (invalid transition)", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");
    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    await expect(ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      InvalidDraftTransitionError,
    );
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: "unknown" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("throws DraftNotFoundError when the student has never created a draft", async () => {
    ctx.studentLookup.seed({ id: "student-no-draft", batchId: "batch-a", userId: "user-x" });
    await expect(
      ctx.useCase.execute({ actor: secretary, studentId: "student-no-draft" }),
    ).rejects.toBeInstanceOf(DraftNotFoundError);
  });

  it("records a PROFILE_APPROVED audit entry", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "PROFILE_APPROVED" }),
    );
  });

  it("notifies the student via NotificationService using the PROFILE_APPROVED template", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    expect(ctx.notificationService.sent).toContainEqual({
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });
  });

  it("re-publishing (a second approval cycle) updates the same published profile, not a duplicate", async () => {
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "first version" }, "PENDING_REVIEW");
    const first = await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    // Student edits again (resets to DRAFT), submits, gets approved again.
    await ctx.draftRepository.updateContent(draft.id, { bio: "second version" }, "PENDING_REVIEW");
    const second = await ctx.useCase.execute({ actor: secretary, studentId: STUDENT_ID });

    expect(second.id).toBe(first.id);
    expect(second.bio).toBe("second version");
  });
});
