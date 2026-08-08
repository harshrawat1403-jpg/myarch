import { beforeEach, describe, expect, it } from "vitest";
import { SetRecruiterActiveUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/set-recruiter-active";
import {
  RecruiterAlreadyActiveError,
  RecruiterAlreadyDisabledError,
  RecruiterAccountNotFoundError,
} from "../../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../../src/lib/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import type { RecruiterAccountRecord } from "../../../../src/modules/recruiters";
import type { AuthenticatedActor } from "../../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<RecruiterAccountRecord> = {}): RecruiterAccountRecord {
  return {
    id: "target-recruiter",
    userId: "target-user",
    email: "target@studio.com",
    fullName: "Target Recruiter",
    companyName: "Studio",
    isActive: true,
    approvalStatus: "APPROVED",
    createdAt: new Date(),
    ...overrides,
  };
}

function buildUseCase() {
  const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
  const auditRecorder = new FakeAuditRecorder();
  const revokedUserIds: string[] = [];
  const revokeUserSessions = async (userId: string) => {
    revokedUserIds.push(userId);
  };
  const useCase = new SetRecruiterActiveUseCase({ recruiterAccountRepository, auditRecorder, revokeUserSessions });
  return { useCase, recruiterAccountRepository, auditRecorder, revokedUserIds };
}

describe("SetRecruiterActiveUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.recruiterAccountRepository.seed(record());
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, recruiterId: "target-recruiter", isActive: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws RecruiterAccountNotFoundError for an unknown id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, recruiterId: "missing", isActive: false }),
    ).rejects.toBeInstanceOf(RecruiterAccountNotFoundError);
  });

  it("disables an active recruiter and revokes their sessions", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter", isActive: false });
    expect(result.isActive).toBe(false);
    expect(ctx.revokedUserIds).toEqual(["target-user"]);
  });

  it("rejects disabling an already-disabled recruiter", async () => {
    ctx.recruiterAccountRepository.seed(record({ isActive: false }));
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter", isActive: false }),
    ).rejects.toBeInstanceOf(RecruiterAlreadyDisabledError);
  });

  it("rejects enabling an already-active recruiter", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter", isActive: true }),
    ).rejects.toBeInstanceOf(RecruiterAlreadyActiveError);
  });

  it("records RECRUITER_DISABLED / RECRUITER_ENABLED audit entries", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter", isActive: false });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "RECRUITER_DISABLED", targetEntityId: "target-user" }),
    );

    await ctx.useCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter", isActive: true });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "RECRUITER_ENABLED", targetEntityId: "target-user" }),
    );
  });
});
