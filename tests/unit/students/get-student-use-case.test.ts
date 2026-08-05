import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetStudentUseCase } from "../../../src/modules/students/application/use-cases/get-student";
import { StudentNotFoundError } from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("GetStudentUseCase — privacy boundaries", () => {
  let studentRepository: InMemoryStudentRepository;
  let useCase: GetStudentUseCase;
  let studentId: string;
  let ownerActor: AuthenticatedActor;

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    useCase = new GetStudentUseCase({ studentRepository });

    const student = await studentRepository.create({
      userId: "user-owner",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Owner Student",
      private: { cgpa: 8.2, internalRemarks: "confidential note" },
      actorUserId: "sec-1",
    });
    studentId = student.id;
    ownerActor = { userId: "user-owner", role: "STUDENT", studentProfileId: studentId };
  });

  it("returns full private fields (including CGPA and internal remarks) to the Secretary", async () => {
    const record = await useCase.execute({ actor: secretary, studentId });
    expect(record.private.cgpa).toBe(8.2);
    expect(record.private.internalRemarks).toBe("confidential note");
  });

  it("returns full private fields to an in-scope Coordinator", async () => {
    const record = await useCase.execute({ actor: coordinatorA, studentId });
    expect(record.private.cgpa).toBe(8.2);
  });

  it("denies an out-of-scope Coordinator (brief's named boundary: cannot view another batch's confidential notes)", async () => {
    await expect(useCase.execute({ actor: coordinatorB, studentId })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("allows the student to view their own record", async () => {
    const record = await useCase.execute({ actor: ownerActor, studentId });
    expect(record.id).toBe(studentId);
  });

  it("denies a different student from viewing this record", async () => {
    const otherStudent: AuthenticatedActor = {
      userId: "user-other",
      role: "STUDENT",
      studentProfileId: "some-other-profile-id",
    };
    await expect(useCase.execute({ actor: otherStudent, studentId })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Recruiter under all circumstances (brief's named boundary: no private data access)", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(useCase.execute({ actor: secretary, studentId: "unknown" })).rejects.toBeInstanceOf(
      StudentNotFoundError,
    );
  });
});
