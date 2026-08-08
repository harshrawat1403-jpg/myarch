import { beforeEach, describe, expect, it } from "vitest";
import { CreateRecruiterAccountUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/create-recruiter-account";
import { DuplicateEmailError } from "../../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../../src/lib/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeRecruiterUserProvisioner } from "../../../support/fakes/fake-recruiter-user-provisioner";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

function buildUseCase() {
  const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
  const recruiterUserProvisioner = new FakeRecruiterUserProvisioner();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CreateRecruiterAccountUseCase({ recruiterAccountRepository, recruiterUserProvisioner, auditRecorder });
  return { useCase, recruiterAccountRepository, recruiterUserProvisioner, auditRecorder };
}

describe("CreateRecruiterAccountUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
  });

  it("rejects a Coordinator actor — recruiter management is Secretary-only", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, email: "new@studio.com", fullName: "Jordan Lee", companyName: "Studio" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("creates a recruiter account, pre-approved, with a plaintext temp password", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      email: "new@studio.com",
      fullName: "Jordan Lee",
      companyName: "Studio Example",
    });

    expect(result.recruiter.approvalStatus).toBe("APPROVED");
    expect(result.recruiter.companyName).toBe("Studio Example");
    expect(result.tempPassword).toBeTruthy();
  });

  it("throws DuplicateEmailError when the email is already in use", async () => {
    ctx.recruiterUserProvisioner.seedExistingEmail("taken@studio.com");
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, email: "taken@studio.com", fullName: "Jordan Lee", companyName: "Studio" }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("records a RECRUITER_CREATED audit entry", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, email: "new@studio.com", fullName: "Jordan Lee", companyName: "Studio" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "RECRUITER_CREATED" }),
    );
  });
});
