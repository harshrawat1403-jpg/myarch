import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ListApprovalQueueUseCase } from "../../../src/modules/profiles/application/use-cases/list-approval-queue";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorNone: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("ListApprovalQueueUseCase", () => {
  let draftRepository: InMemoryProfileDraftRepository;
  let useCase: ListApprovalQueueUseCase;

  beforeEach(async () => {
    draftRepository = new InMemoryProfileDraftRepository();
    useCase = new ListApprovalQueueUseCase({ profileDraftRepository: draftRepository });

    draftRepository.seedStudentInfo("student-a1", { fullName: "Alice", batchId: "batch-a" });
    draftRepository.seedStudentInfo("student-b1", { fullName: "Bob", batchId: "batch-b" });

    const draftA = await draftRepository.create("student-a1");
    await draftRepository.transitionStatus(draftA.id, { status: "PENDING_REVIEW", submittedAt: new Date() });

    const draftB = await draftRepository.create("student-b1");
    await draftRepository.transitionStatus(draftB.id, { status: "PENDING_REVIEW", submittedAt: new Date() });

    // A draft still in DRAFT status must never appear in the queue.
    await draftRepository.create("student-c1");
  });

  it("returns every pending-review draft for the Secretary", async () => {
    const queue = await useCase.execute({ actor: secretary });
    expect(queue.map((q) => q.studentFullName).sort()).toEqual(["Alice", "Bob"]);
  });

  it("restricts a Coordinator's queue to their assigned batch(es)", async () => {
    const queue = await useCase.execute({ actor: coordinatorA });
    expect(queue.map((q) => q.studentFullName)).toEqual(["Alice"]);
  });

  it("returns an empty queue for a Coordinator with no batch scope", async () => {
    const queue = await useCase.execute({ actor: coordinatorNone });
    expect(queue).toEqual([]);
  });

  it("never includes a draft that hasn't been submitted (still DRAFT status)", async () => {
    const queue = await useCase.execute({ actor: secretary });
    expect(queue.find((q) => q.studentProfileId === "student-c1")).toBeUndefined();
  });

  it("denies a Student from viewing the approval queue", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter from viewing the approval queue", async () => {
    await expect(useCase.execute({ actor: recruiter })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
