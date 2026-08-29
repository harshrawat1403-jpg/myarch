import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateCommitteeUseCase } from "../../../src/modules/committees/application/use-cases/create-committee";
import { InMemoryCommitteeRepository } from "../../support/fakes/in-memory-committee-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const committeeRepository = new InMemoryCommitteeRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CreateCommitteeUseCase({ committeeRepository, auditRecorder });
  return { useCase, committeeRepository, auditRecorder };
}

describe("CreateCommitteeUseCase", () => {
  it("creates an ACTIVE committee and records an audit entry", async () => {
    const ctx = buildContext();
    const committee = await ctx.useCase.execute({ actor: SECRETARY, name: "Student Council", type: "STUDENT_COUNCIL" });

    expect(committee.status).toBe("ACTIVE");
    expect(committee.name).toBe("Student Council");
    expect(ctx.auditRecorder.entries).toHaveLength(1);
    expect(ctx.auditRecorder.entries[0]!.action).toBe("COMMITTEE_CREATED");
  });

  it("trims name/academicYear/responsibilities", async () => {
    const ctx = buildContext();
    const committee = await ctx.useCase.execute({
      actor: SECRETARY,
      name: "  Core Committee  ",
      type: "CORE_COMMITTEE",
      academicYear: "  2025-2026  ",
      responsibilities: "  Oversees everything  ",
    });

    expect(committee.name).toBe("Core Committee");
    expect(committee.academicYear).toBe("2025-2026");
    expect(committee.responsibilities).toBe("Oversees everything");
  });

  it("rejects a Student — Students cannot create committees", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: STUDENT, name: "Rogue Committee", type: "TEMPORARY_COMMITTEE" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
