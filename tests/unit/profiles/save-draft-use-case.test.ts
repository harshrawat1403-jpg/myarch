import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveDraftUseCase } from "../../../src/modules/profiles/application/use-cases/save-draft";
import { DraftLockedForReviewError } from "../../../src/modules/profiles/domain/errors";
import { StudentNotFoundError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";

const STUDENT_ID = "student-1";
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };
const otherStudent: AuthenticatedActor = {
  userId: "user-2",
  role: "STUDENT",
  studentProfileId: "student-2",
};
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorInScope: AuthenticatedActor = {
  userId: "coord-1",
  role: "COORDINATOR",
  batchScope: ["batch-a"],
};
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("SaveDraftUseCase", () => {
  let draftRepository: InMemoryProfileDraftRepository;
  let studentLookup: InMemoryProfilesStudentLookup;
  let useCase: SaveDraftUseCase;

  beforeEach(() => {
    draftRepository = new InMemoryProfileDraftRepository();
    studentLookup = new InMemoryProfilesStudentLookup();
    studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1" });
    useCase = new SaveDraftUseCase({ profileDraftRepository: draftRepository, studentLookup });
  });

  it("creates a draft on first edit when none exists yet", async () => {
    const draft = await useCase.execute({
      actor: owner,
      studentId: STUDENT_ID,
      content: { bio: "Architecture student" },
    });
    expect(draft.status).toBe("DRAFT");
    expect(draft.bio).toBe("Architecture student");
  });

  it("keeps status DRAFT across repeated edits", async () => {
    await useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    const draft = await useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v2" } });
    expect(draft.status).toBe("DRAFT");
    expect(draft.bio).toBe("v2");
  });

  it("denies a student editing someone else's draft (brief's named privacy boundary)", async () => {
    await expect(
      useCase.execute({ actor: otherStudent, studentId: STUDENT_ID, content: { bio: "hijack" } }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies the Secretary from directly editing draft content (student-only action)", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: STUDENT_ID, content: { bio: "admin edit" } }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Coordinator from directly editing draft content", async () => {
    await expect(
      useCase.execute({
        actor: coordinatorInScope,
        studentId: STUDENT_ID,
        content: { bio: "coordinator edit" },
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter outright", async () => {
    await expect(
      useCase.execute({ actor: recruiter, studentId: STUDENT_ID, content: { bio: "x" } }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      useCase.execute({
        actor: { userId: "u", role: "STUDENT", studentProfileId: "unknown" },
        studentId: "unknown",
        content: { bio: "x" },
      }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("blocks editing while the draft is PENDING_REVIEW", async () => {
    const draft = await useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    await draftRepository.transitionStatus(draft.id, { status: "PENDING_REVIEW", submittedAt: new Date() });

    await expect(
      useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "sneaky edit" } }),
    ).rejects.toBeInstanceOf(DraftLockedForReviewError);
  });

  it("resets status to DRAFT when editing an APPROVED draft (new unreviewed cycle)", async () => {
    const draft = await useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    await draftRepository.transitionStatus(draft.id, { status: "APPROVED", reviewedAt: new Date() });

    const edited = await useCase.execute({
      actor: owner,
      studentId: STUDENT_ID,
      content: { bio: "v2 after approval" },
    });
    expect(edited.status).toBe("DRAFT");
  });

  it("keeps status CHANGES_REQUESTED while the student is fixing it (doesn't silently clear the flag)", async () => {
    const draft = await useCase.execute({ actor: owner, studentId: STUDENT_ID, content: { bio: "v1" } });
    await draftRepository.transitionStatus(draft.id, {
      status: "CHANGES_REQUESTED",
      reviewComment: "Please add a portfolio link",
    });

    const edited = await useCase.execute({
      actor: owner,
      studentId: STUDENT_ID,
      content: { portfolioLinks: ["https://example.com/portfolio"] },
    });
    expect(edited.status).toBe("CHANGES_REQUESTED");
    expect(edited.reviewComment).toBe("Please add a portfolio link");
  });
});
