import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetDraftUseCase } from "../../../src/modules/profiles/application/use-cases/get-draft";
import { DraftNotFoundError } from "../../../src/modules/profiles/domain/errors";
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
const coordinatorOutOfScope: AuthenticatedActor = {
  userId: "coord-2",
  role: "COORDINATOR",
  batchScope: ["batch-b"],
};
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("GetDraftUseCase — 'Recruiters must never see drafts'", () => {
  let draftRepository: InMemoryProfileDraftRepository;
  let studentLookup: InMemoryProfilesStudentLookup;
  let useCase: GetDraftUseCase;

  beforeEach(async () => {
    draftRepository = new InMemoryProfileDraftRepository();
    studentLookup = new InMemoryProfilesStudentLookup();
    studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1" });
    useCase = new GetDraftUseCase({ profileDraftRepository: draftRepository, studentLookup });
    await draftRepository.create(STUDENT_ID);
  });

  it("allows the owning student to view their own draft", async () => {
    const draft = await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(draft.studentProfileId).toBe(STUDENT_ID);
  });

  it("allows the Secretary", async () => {
    const draft = await useCase.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(draft.studentProfileId).toBe(STUDENT_ID);
  });

  it("allows an in-scope Coordinator", async () => {
    const draft = await useCase.execute({ actor: coordinatorInScope, studentId: STUDENT_ID });
    expect(draft.studentProfileId).toBe(STUDENT_ID);
  });

  it("denies an out-of-scope Coordinator", async () => {
    await expect(
      useCase.execute({ actor: coordinatorOutOfScope, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a different student", async () => {
    await expect(
      useCase.execute({ actor: otherStudent, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter absolutely — the central requirement of this module", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: "unknown" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("throws DraftNotFoundError when the student has no draft yet", async () => {
    studentLookup.seed({ id: "student-no-draft", batchId: "batch-a", userId: "user-x" });
    await expect(
      useCase.execute({ actor: secretary, studentId: "student-no-draft" }),
    ).rejects.toBeInstanceOf(DraftNotFoundError);
  });
});
