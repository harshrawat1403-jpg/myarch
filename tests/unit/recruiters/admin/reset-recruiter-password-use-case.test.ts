import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../../src/modules/auth";
import { ResetRecruiterPasswordUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/reset-password";
import { RecruiterAccountNotFoundError } from "../../../../src/modules/recruiters/domain/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import type { RecruiterAccountRecord } from "../../../../src/modules/recruiters";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(overrides: Partial<RecruiterAccountRecord> = {}): RecruiterAccountRecord {
  return {
    id: "rec-1",
    userId: "user-1",
    email: "alice@studio.com",
    fullName: "Alice Recruiter",
    companyName: "Studio",
    isActive: true,
    approvalStatus: "APPROVED",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ResetRecruiterPasswordUseCase", () => {
  it("throws RecruiterAccountNotFoundError for an unknown id, without ever calling resetPassword", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    const resetPassword = vi.fn();
    const useCase = new ResetRecruiterPasswordUseCase({ recruiterAccountRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, recruiterId: "missing" })).rejects.toBeInstanceOf(
      RecruiterAccountNotFoundError,
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resolves the recruiter's userId/fullName and delegates to the shared reset primitive", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record());
    const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "generated-temp-pw" });
    const useCase = new ResetRecruiterPasswordUseCase({ recruiterAccountRepository, resetPassword });

    const result = await useCase.execute({ actor: SECRETARY, recruiterId: "rec-1" });

    expect(result).toEqual({ tempPassword: "generated-temp-pw" });
    expect(resetPassword).toHaveBeenCalledWith({
      actor: SECRETARY,
      targetUserId: "user-1",
      targetRole: "RECRUITER",
      recipientName: "Alice Recruiter",
    });
  });

  it("propagates an error thrown by the shared reset primitive (e.g. permission denial)", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record());
    const resetPassword = vi.fn().mockRejectedValue(new Error("Not authorized"));
    const useCase = new ResetRecruiterPasswordUseCase({ recruiterAccountRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, recruiterId: "rec-1" })).rejects.toThrow("Not authorized");
  });
});
