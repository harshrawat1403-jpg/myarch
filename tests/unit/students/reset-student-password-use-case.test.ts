import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ResetStudentPasswordUseCase } from "../../../src/modules/students/application/use-cases/reset-password";
import { StudentNotFoundError } from "../../../src/modules/students/domain/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("ResetStudentPasswordUseCase", () => {
  it("throws StudentNotFoundError for an unknown id, without ever calling resetPassword", async () => {
    const studentRepository = new InMemoryStudentRepository();
    const resetPassword = vi.fn();
    const useCase = new ResetStudentPasswordUseCase({ studentRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, studentId: "missing" })).rejects.toBeInstanceOf(
      StudentNotFoundError,
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resolves the student's userId/batchId/fullName and delegates to the shared reset primitive", async () => {
    const studentRepository = new InMemoryStudentRepository();
    const student = await studentRepository.create({
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Alice Student",
      private: {},
      actorUserId: "sec-1",
    });
    const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "generated-temp-pw" });
    const useCase = new ResetStudentPasswordUseCase({ studentRepository, resetPassword });

    const result = await useCase.execute({ actor: SECRETARY, studentId: student.id });

    expect(result).toEqual({ tempPassword: "generated-temp-pw" });
    expect(resetPassword).toHaveBeenCalledWith({
      actor: SECRETARY,
      targetUserId: "user-1",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice Student",
    });
  });

  it("propagates an error thrown by the shared reset primitive (e.g. permission denial)", async () => {
    const studentRepository = new InMemoryStudentRepository();
    const student = await studentRepository.create({
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Alice Student",
      private: {},
      actorUserId: "sec-1",
    });
    const resetPassword = vi.fn().mockRejectedValue(new Error("Not authorized"));
    const useCase = new ResetStudentPasswordUseCase({ studentRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, studentId: student.id })).rejects.toThrow("Not authorized");
  });
});
