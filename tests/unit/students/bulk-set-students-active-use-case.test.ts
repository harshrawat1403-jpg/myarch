import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ArchiveStudentUseCase } from "../../../src/modules/students/application/use-cases/archive-student";
import { RestoreStudentUseCase } from "../../../src/modules/students/application/use-cases/restore-student";
import { BulkSetStudentsActiveUseCase } from "../../../src/modules/students/application/use-cases/bulk-set-students-active";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("BulkSetStudentsActiveUseCase", () => {
  let studentRepository: InMemoryStudentRepository;
  let auditRecorder: FakeAuditRecorder;
  let bulkUseCase: BulkSetStudentsActiveUseCase;
  let studentIds: string[];

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    auditRecorder = new FakeAuditRecorder();
    const archiveStudentUseCase = new ArchiveStudentUseCase({ studentRepository });
    const restoreStudentUseCase = new RestoreStudentUseCase({ studentRepository });
    bulkUseCase = new BulkSetStudentsActiveUseCase({ archiveStudentUseCase, restoreStudentUseCase, auditRecorder });

    studentIds = [];
    for (const rollNumber of ["S1", "S2", "S3"]) {
      const student = await studentRepository.create({
        userId: `user-${rollNumber}`,
        batchId: "batch-a",
        rollNumber,
        fullName: `Student ${rollNumber}`,
        private: {},
        actorUserId: "sec-1",
      });
      studentIds.push(student.id);
    }
  });

  it("archives every student id given and reports them as succeeded", async () => {
    const result = await bulkUseCase.execute({ actor: SECRETARY, studentIds, isActive: false });

    expect(result.succeeded).toEqual(studentIds);
    expect(result.failed).toHaveLength(0);
    expect((await studentRepository.findById(studentIds[0]!))!.isActive).toBe(false);
  });

  it("restores every student id given and reports them as succeeded", async () => {
    await bulkUseCase.execute({ actor: SECRETARY, studentIds, isActive: false });
    const result = await bulkUseCase.execute({ actor: SECRETARY, studentIds, isActive: true });

    expect(result.succeeded).toEqual(studentIds);
    expect((await studentRepository.findById(studentIds[0]!))!.isActive).toBe(true);
  });

  it("collects a per-id failure without aborting the rest of the batch", async () => {
    const result = await bulkUseCase.execute({
      actor: SECRETARY,
      studentIds: [studentIds[0]!, "does-not-exist", studentIds[2]!],
      isActive: false,
    });

    expect(result.succeeded).toEqual([studentIds[0], studentIds[2]]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.id).toBe("does-not-exist");
  });

  it("records a single BULK_OPERATION audit entry summarizing the batch", async () => {
    await bulkUseCase.execute({ actor: SECRETARY, studentIds: studentIds.slice(0, 2), isActive: false });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        action: "BULK_OPERATION",
        metadata: expect.objectContaining({ entityType: "student", operation: "archive", count: 2 }),
      }),
    );
  });
});
