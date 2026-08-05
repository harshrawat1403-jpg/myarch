import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { UpdateStudentUseCase } from "../../../src/modules/students/application/use-cases/update-student";
import { BatchNotAssignableError, BatchNotFoundError, StudentNotFoundError } from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };

describe("UpdateStudentUseCase", () => {
  let studentRepository: InMemoryStudentRepository;
  let batchLookup: InMemoryBatchLookup;
  let useCase: UpdateStudentUseCase;
  let studentId: string;

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    batchLookup = new InMemoryBatchLookup();
    batchLookup.seed("batch-a", "ACTIVE");
    batchLookup.seed("batch-b", "ACTIVE");
    batchLookup.seed("batch-archived", "ARCHIVED");
    useCase = new UpdateStudentUseCase({ studentRepository, batchLookup });

    const student = await studentRepository.create({
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Original Name",
      private: { cgpa: 7 },
      actorUserId: "sec-1",
    });
    studentId = student.id;
  });

  it("allows the Secretary to update fullName", async () => {
    const updated = await useCase.execute({ actor: secretary, studentId, fullName: "New Name" });
    expect(updated.fullName).toBe("New Name");
  });

  it("allows an in-scope Coordinator to update private fields (CGPA, backlog, remarks)", async () => {
    const updated = await useCase.execute({
      actor: coordinatorA,
      studentId,
      private: { cgpa: 9.1, hasActiveBacklog: true, internalRemarks: "Needs review" },
    });
    expect(updated.private.cgpa).toBe(9.1);
    expect(updated.private.hasActiveBacklog).toBe(true);
    expect(updated.private.internalRemarks).toBe("Needs review");
  });

  it("denies an out-of-scope Coordinator (brief's named boundary)", async () => {
    await expect(
      useCase.execute({ actor: coordinatorB, studentId, fullName: "Hacked Name" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: "unknown", fullName: "X" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("reassigns a student to a different valid, active batch", async () => {
    const updated = await useCase.execute({ actor: secretary, studentId, batchId: "batch-b" });
    expect(updated.batchId).toBe("batch-b");
  });

  it("rejects reassignment to a non-existent batch", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId, batchId: "no-such-batch" }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("rejects reassignment to an archived batch (invalid batch assignment)", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId, batchId: "batch-archived" }),
    ).rejects.toBeInstanceOf(BatchNotAssignableError);
  });

  it("denies a Coordinator reassigning a student into a batch outside their own scope", async () => {
    await expect(
      useCase.execute({ actor: coordinatorA, studentId, batchId: "batch-b" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
