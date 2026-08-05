import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ArchiveStudentUseCase } from "../../../src/modules/students/application/use-cases/archive-student";
import { RestoreStudentUseCase } from "../../../src/modules/students/application/use-cases/restore-student";
import {
  StudentAlreadyActiveError,
  StudentAlreadyArchivedError,
  StudentNotFoundError,
} from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };

describe("ArchiveStudentUseCase / RestoreStudentUseCase", () => {
  let studentRepository: InMemoryStudentRepository;
  let archiveUseCase: ArchiveStudentUseCase;
  let restoreUseCase: RestoreStudentUseCase;
  let studentId: string;

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    archiveUseCase = new ArchiveStudentUseCase({ studentRepository });
    restoreUseCase = new RestoreStudentUseCase({ studentRepository });

    const student = await studentRepository.create({
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Test Student",
      private: {},
      actorUserId: "sec-1",
    });
    studentId = student.id;
  });

  it("archives an active student (soft delete, not removed)", async () => {
    const archived = await archiveUseCase.execute({ actor: secretary, studentId });
    expect(archived.isActive).toBe(false);

    const stillFindable = await studentRepository.findById(studentId);
    expect(stillFindable).not.toBeNull();
  });

  it("denies an out-of-scope Coordinator from archiving", async () => {
    await expect(
      archiveUseCase.execute({ actor: coordinatorB, studentId }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects archiving an already-archived student", async () => {
    await archiveUseCase.execute({ actor: secretary, studentId });
    await expect(archiveUseCase.execute({ actor: secretary, studentId })).rejects.toBeInstanceOf(
      StudentAlreadyArchivedError,
    );
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      archiveUseCase.execute({ actor: secretary, studentId: "unknown" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("restores an archived student", async () => {
    await archiveUseCase.execute({ actor: secretary, studentId });
    const restored = await restoreUseCase.execute({ actor: secretary, studentId });
    expect(restored.isActive).toBe(true);
  });

  it("allows an in-scope Coordinator to restore", async () => {
    await archiveUseCase.execute({ actor: secretary, studentId });
    const restored = await restoreUseCase.execute({ actor: coordinatorA, studentId });
    expect(restored.isActive).toBe(true);
  });

  it("rejects restoring a student that is already active", async () => {
    await expect(restoreUseCase.execute({ actor: secretary, studentId })).rejects.toBeInstanceOf(
      StudentAlreadyActiveError,
    );
  });

  it("denies an out-of-scope Coordinator from restoring", async () => {
    await archiveUseCase.execute({ actor: secretary, studentId });
    await expect(
      restoreUseCase.execute({ actor: coordinatorB, studentId }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
