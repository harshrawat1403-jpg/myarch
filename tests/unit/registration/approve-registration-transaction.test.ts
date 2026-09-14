import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, buildCreateStudentUseCase, buildAdminResetPasswordUseCase } = vi.hoisted(() => ({
  transaction: vi.fn(),
  buildCreateStudentUseCase: vi.fn(),
  buildAdminResetPasswordUseCase: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction },
}));

vi.mock("@/modules/students", () => ({ buildCreateStudentUseCase }));
vi.mock("@/modules/auth", () => ({
  buildAdminResetPasswordUseCase,
  getIssueEmailVerificationTokenUseCase: () => ({ execute: vi.fn() }),
}));

vi.mock("@/modules/notifications", () => ({
  renderEmailTemplate: vi.fn(),
  sendDirectEmail: vi.fn(),
  notificationService: { notify: vi.fn() },
}));

import { runApproveTransaction } from "../../../src/modules/registration/infrastructure/container";

describe("registration approval transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses one bounded transaction client for a populated account approval", async () => {
    const tx = {
      registrationRequest: { update: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const createStudent = vi.fn().mockResolvedValue({ id: "student-1" });
    const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "Temporary1!" });
    buildCreateStudentUseCase.mockReturnValue({ execute: createStudent });
    buildAdminResetPasswordUseCase.mockReturnValue({ execute: resetPassword });
    transaction.mockImplementation(async (work) => work(tx));

    const result = await runApproveTransaction(async (ctx) => {
      await ctx.createStudent({ request: "student" } as never);
      await ctx.resetPassword({ targetUserId: "user-1" } as never);
      await ctx.registrationRequestRepository.decide("request-1", {
        status: "APPROVED",
        decidedByUserId: "secretary-1",
        resultingStudentProfileId: "student-1",
      });
      await ctx.auditRecorder.record({
        actorUserId: "secretary-1",
        action: "REGISTRATION_REQUEST_APPROVED",
        targetEntityType: "RegistrationRequest",
        targetEntityId: "request-1",
      });
      return "committed";
    });

    expect(result.result).toBe("committed");
    expect(transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxWait: 10_000, timeout: 20_000 }),
    );
    expect(buildCreateStudentUseCase).toHaveBeenCalledWith(tx);
    expect(buildAdminResetPasswordUseCase).toHaveBeenCalledWith(tx, expect.any(Object));
    expect(tx.registrationRequest.update).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
});
