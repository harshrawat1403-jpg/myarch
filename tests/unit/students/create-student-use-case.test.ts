import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateStudentUseCase } from "../../../src/modules/students/application/use-cases/create-student";
import {
  BatchNotAssignableError,
  BatchNotFoundError,
  DuplicateEmailError,
  DuplicateRollNumberError,
} from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { FakeUserProvisioner } from "../../support/fakes/fake-user-provisioner";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function buildUseCase() {
  const studentRepository = new InMemoryStudentRepository();
  const batchLookup = new InMemoryBatchLookup();
  const userProvisioner = new FakeUserProvisioner();
  batchLookup.seed("batch-a", "ACTIVE");
  batchLookup.seed("batch-archived", "ARCHIVED");

  const useCase = new CreateStudentUseCase({ studentRepository, batchLookup, userProvisioner });
  return { useCase, studentRepository, batchLookup, userProvisioner };
}

describe("CreateStudentUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
  });

  it("creates a student when the Secretary requests it", async () => {
    const student = await ctx.useCase.execute({
      actor: secretary,
      email: "jane@example.edu",
      fullName: "Jane Doe",
      rollNumber: "BA2026001",
      batchId: "batch-a",
    });

    expect(student.fullName).toBe("Jane Doe");
    expect(student.rollNumber).toBe("BA2026001");
    expect(student.batchId).toBe("batch-a");
    expect(student.isActive).toBe(true);
  });

  it("provisions a login account (User) for the new student", async () => {
    await ctx.useCase.execute({
      actor: secretary,
      email: "Jane@Example.EDU",
      fullName: "Jane Doe",
      rollNumber: "BA2026001",
      batchId: "batch-a",
    });
    expect(ctx.userProvisioner.provisionedEmails).toContain("jane@example.edu");
  });

  it("allows an in-scope Coordinator to create a student in their batch", async () => {
    const student = await ctx.useCase.execute({
      actor: coordinatorA,
      email: "student@example.edu",
      fullName: "Student One",
      rollNumber: "BA2026002",
      batchId: "batch-a",
    });
    expect(student.batchId).toBe("batch-a");
  });

  it("denies a Coordinator creating a student outside their batch scope (brief's named boundary)", async () => {
    await expect(
      ctx.useCase.execute({
        actor: coordinatorB,
        email: "student@example.edu",
        fullName: "Student One",
        rollNumber: "BA2026003",
        batchId: "batch-a",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter outright", async () => {
    await expect(
      ctx.useCase.execute({
        actor: recruiter,
        email: "student@example.edu",
        fullName: "Student One",
        rollNumber: "BA2026004",
        batchId: "batch-a",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects assignment to a non-existent batch", async () => {
    await expect(
      ctx.useCase.execute({
        actor: secretary,
        email: "student@example.edu",
        fullName: "Student One",
        rollNumber: "BA2026005",
        batchId: "no-such-batch",
      }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("rejects assignment to an archived batch (invalid batch assignment)", async () => {
    await expect(
      ctx.useCase.execute({
        actor: secretary,
        email: "student@example.edu",
        fullName: "Student One",
        rollNumber: "BA2026006",
        batchId: "batch-archived",
      }),
    ).rejects.toBeInstanceOf(BatchNotAssignableError);
  });

  it("rejects a duplicate roll number", async () => {
    await ctx.useCase.execute({
      actor: secretary,
      email: "first@example.edu",
      fullName: "First Student",
      rollNumber: "BA2026007",
      batchId: "batch-a",
    });

    await expect(
      ctx.useCase.execute({
        actor: secretary,
        email: "second@example.edu",
        fullName: "Second Student",
        rollNumber: "BA2026007",
        batchId: "batch-a",
      }),
    ).rejects.toBeInstanceOf(DuplicateRollNumberError);
  });

  it("rejects a duplicate email", async () => {
    await ctx.useCase.execute({
      actor: secretary,
      email: "duplicate@example.edu",
      fullName: "First Student",
      rollNumber: "BA2026008",
      batchId: "batch-a",
    });

    await expect(
      ctx.useCase.execute({
        actor: secretary,
        email: "duplicate@example.edu",
        fullName: "Second Student",
        rollNumber: "BA2026009",
        batchId: "batch-a",
      }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("accepts optional private fields at creation", async () => {
    const student = await ctx.useCase.execute({
      actor: secretary,
      email: "withprivate@example.edu",
      fullName: "Private Fields Student",
      rollNumber: "BA2026010",
      batchId: "batch-a",
      private: { cgpa: 8.5, hasActiveBacklog: false, phone: "9999999999" },
    });

    expect(student.private.cgpa).toBe(8.5);
    expect(student.private.phone).toBe("9999999999");
  });
});
