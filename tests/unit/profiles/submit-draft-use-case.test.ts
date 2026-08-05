import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SubmitDraftUseCase } from "../../../src/modules/profiles/application/use-cases/submit-draft";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../../src/modules/profiles/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const STUDENT_ID = "student-1";
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };
const otherStudent: AuthenticatedActor = {
  userId: "user-2",
  role: "STUDENT",
  studentProfileId: "student-2",
};
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("SubmitDraftUseCase", () => {
  let draftRepository: InMemoryProfileDraftRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: SubmitDraftUseCase;

  beforeEach(() => {
    draftRepository = new InMemoryProfileDraftRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new SubmitDraftUseCase({ profileDraftRepository: draftRepository, auditRecorder });
  });

  it("submits a DRAFT, moving it to PENDING_REVIEW", async () => {
    await draftRepository.create(STUDENT_ID);
    const submitted = await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(submitted.status).toBe("PENDING_REVIEW");
    expect(submitted.submittedAt).not.toBeNull();
  });

  it("submits a CHANGES_REQUESTED draft (resubmission), moving it to PENDING_REVIEW", async () => {
    const draft = await draftRepository.create(STUDENT_ID);
    await draftRepository.transitionStatus(draft.id, {
      status: "CHANGES_REQUESTED",
      reviewComment: "fix this",
    });

    const submitted = await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(submitted.status).toBe("PENDING_REVIEW");
  });

  it("clears the previous review comment on resubmission", async () => {
    const draft = await draftRepository.create(STUDENT_ID);
    await draftRepository.transitionStatus(draft.id, {
      status: "CHANGES_REQUESTED",
      reviewComment: "fix this",
      reviewedByUserId: "sec-1",
      reviewedAt: new Date(),
    });

    const submitted = await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(submitted.reviewComment).toBeNull();
    expect(submitted.reviewedByUserId).toBeNull();
  });

  it("rejects submitting an already-PENDING_REVIEW draft (invalid transition)", async () => {
    const draft = await draftRepository.create(STUDENT_ID);
    await draftRepository.transitionStatus(draft.id, { status: "PENDING_REVIEW", submittedAt: new Date() });

    await expect(useCase.execute({ actor: owner, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      InvalidDraftTransitionError,
    );
  });

  it("rejects submitting an already-APPROVED draft (invalid transition — must edit first)", async () => {
    const draft = await draftRepository.create(STUDENT_ID);
    await draftRepository.transitionStatus(draft.id, { status: "APPROVED", reviewedAt: new Date() });

    await expect(useCase.execute({ actor: owner, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      InvalidDraftTransitionError,
    );
  });

  it("throws DraftNotFoundError when no draft exists yet", async () => {
    await expect(useCase.execute({ actor: owner, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
  });

  it("denies a different student from submitting this draft", async () => {
    await draftRepository.create(STUDENT_ID);
    await expect(
      useCase.execute({ actor: otherStudent, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies the Secretary from submitting on the student's behalf", async () => {
    await draftRepository.create(STUDENT_ID);
    await expect(useCase.execute({ actor: secretary, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("records a PROFILE_DRAFT_SUBMITTED audit entry", async () => {
    await draftRepository.create(STUDENT_ID);
    await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "user-1", action: "PROFILE_DRAFT_SUBMITTED" }),
    );
  });
});
