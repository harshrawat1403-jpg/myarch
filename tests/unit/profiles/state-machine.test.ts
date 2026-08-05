/**
 * A dedicated, end-to-end exercise of the full profile status state machine
 * across all four use cases together — complementing the per-use-case unit
 * tests with one canonical reference for the whole lifecycle and every
 * invalid transition in one place, per this phase's explicit testing
 * requirement ("comprehensive tests for every state transition, including
 * invalid transitions").
 *
 * The machine (docs: Days 5–6 implementation decision — 4 stored states,
 * "Submitted" is a transient action, not a state):
 *
 *   (none) --edit--> DRAFT --submit--> PENDING_REVIEW --approve--> APPROVED
 *                      ^                     |                       |
 *                      |                     +--requestChanges--> CHANGES_REQUESTED
 *                      |                                              |
 *                      +---------------------edit<--------------------+
 *                      ^                                              |
 *                      +------------------------edit<------------------(APPROVED, resets)
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveDraftUseCase } from "../../../src/modules/profiles/application/use-cases/save-draft";
import { SubmitDraftUseCase } from "../../../src/modules/profiles/application/use-cases/submit-draft";
import { ApproveDraftUseCase } from "../../../src/modules/profiles/application/use-cases/approve-draft";
import { RequestChangesUseCase } from "../../../src/modules/profiles/application/use-cases/request-changes";
import {
  DraftLockedForReviewError,
  InvalidDraftTransitionError,
} from "../../../src/modules/profiles/domain/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { InMemoryPublishedProfileRepository } from "../../support/fakes/in-memory-published-profile-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const STUDENT_ID = "student-1";
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function buildWorld() {
  const draftRepository = new InMemoryProfileDraftRepository();
  const publishedProfileRepository = new InMemoryPublishedProfileRepository();
  const studentLookup = new InMemoryProfilesStudentLookup();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1" });

  return {
    draftRepository,
    saveDraft: new SaveDraftUseCase({ profileDraftRepository: draftRepository, studentLookup }),
    submitDraft: new SubmitDraftUseCase({ profileDraftRepository: draftRepository, auditRecorder }),
    approveDraft: new ApproveDraftUseCase({
      profileDraftRepository: draftRepository,
      publishedProfileRepository,
      studentLookup,
      auditRecorder,
      notificationService,
    }),
    requestChanges: new RequestChangesUseCase({
      profileDraftRepository: draftRepository,
      studentLookup,
      auditRecorder,
      notificationService,
    }),
    publishedProfileRepository,
    notificationService,
  };
}

describe("Profile status state machine — full lifecycle", () => {
  it("walks the happy path: edit -> submit -> approve -> publish", async () => {
    const w = buildWorld();

    let draft = await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    expect(draft.status).toBe("DRAFT");

    draft = await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
    expect(draft.status).toBe("PENDING_REVIEW");

    const published = await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(published.bio).toBe("v1");

    const reloadedDraft = await w.draftRepository.findByStudentId(STUDENT_ID);
    expect(reloadedDraft!.status).toBe("APPROVED");
  });

  it("walks the changes-requested path: edit -> submit -> request changes -> edit -> resubmit -> approve", async () => {
    const w = buildWorld();

    await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });

    const afterReview = await w.requestChanges.execute({
      actor: secretary,
      studentId: STUDENT_ID,
      reviewComment: "Add a portfolio link",
    });
    expect(afterReview.status).toBe("CHANGES_REQUESTED");
    expect(afterReview.reviewComment).toBe("Add a portfolio link");

    const afterFix = await w.saveDraft.execute({
      actor: owner,
      studentId: STUDENT_ID,
      content: { portfolioLinks: ["https://example.com"] },
    });
    // Preserves CHANGES_REQUESTED (and the comment) until explicitly resubmitted.
    expect(afterFix.status).toBe("CHANGES_REQUESTED");
    expect(afterFix.reviewComment).toBe("Add a portfolio link");

    const resubmitted = await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
    expect(resubmitted.status).toBe("PENDING_REVIEW");
    expect(resubmitted.reviewComment).toBeNull();

    const published = await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(published.portfolioLinks).toEqual(["https://example.com"]);
  });

  it("walks the edit-after-approval path: approved draft edited again resets to DRAFT, requiring a fresh submit/approve cycle", async () => {
    const w = buildWorld();

    await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
    await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });

    const editedAfterApproval = await w.saveDraft.execute({
      actor: owner,
      studentId: STUDENT_ID,
      content: { bio: "v2" },
    });
    expect(editedAfterApproval.status).toBe("DRAFT");

    // The published profile is untouched until a fresh approval.
    const stillPublished = await w.publishedProfileRepository.findByStudentId(STUDENT_ID);
    expect(stillPublished!.bio).toBe("v1");

    await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
    const republished = await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(republished.bio).toBe("v2");
  });

  describe("invalid transitions are rejected at every stage", () => {
    it("cannot submit with no draft at all", async () => {
      const w = buildWorld();
      await expect(w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID })).rejects.toThrow();
    });

    it("cannot approve a draft that was never submitted (DRAFT)", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await expect(
        w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot request changes on a draft that was never submitted (DRAFT)", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await expect(
        w.requestChanges.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot edit while PENDING_REVIEW (locked for review)", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });

      await expect(
        w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "sneaky" } }),
      ).rejects.toBeInstanceOf(DraftLockedForReviewError);
    });

    it("cannot submit while already PENDING_REVIEW (double submit)", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });

      await expect(
        w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot approve a draft twice in a row without a new submission", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
      await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });

      await expect(
        w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot request changes on an already-CHANGES_REQUESTED draft without resubmission", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
      await w.requestChanges.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" });

      await expect(
        w.requestChanges.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix again" }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot approve a CHANGES_REQUESTED draft directly — must be resubmitted first", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
      await w.requestChanges.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "fix" });

      await expect(
        w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });

    it("cannot submit an APPROVED draft without editing it first (nothing changed)", async () => {
      const w = buildWorld();
      await w.saveDraft.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
      await w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID });
      await w.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });

      await expect(
        w.submitDraft.execute({ actor: owner, studentId: STUDENT_ID }),
      ).rejects.toBeInstanceOf(InvalidDraftTransitionError);
    });
  });
});
