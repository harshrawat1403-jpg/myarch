import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendRegistrationCredentialsUseCase } from "../../../src/modules/registration/application/use-cases/resend-registration-credentials";
import { InvalidRegistrationTransitionError } from "../../../src/modules/registration/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { AUDIT_ACTIONS } from "../../../src/lib/audit-actions";
import { InMemoryRegistrationRequestRepository } from "../../support/fakes/in-memory-registration-request-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RegistrationRequestRecord } from "../../../src/modules/registration";

const SECRETARY: AuthenticatedActor = { userId: "secretary-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coordinator-1", role: "COORDINATOR", batchScope: ["batch-1"] };

function approvedRequest(): RegistrationRequestRecord {
  const now = new Date();
  return {
    id: "request-1",
    email: "student@example.edu",
    fullName: "Student Name",
    rollNumber: "BA2027001",
    batchId: "batch-1",
    submittedData: {},
    status: "APPROVED",
    emailVerifiedAt: null,
    coordinatorComment: null,
    reviewedByUserId: null,
    reviewedAt: null,
    decidedByUserId: "secretary-1",
    decidedAt: now,
    rejectionReason: null,
    resultingStudentProfileId: "student-1",
    createdAt: now,
    updatedAt: now,
  };
}

function setup() {
  const registrationRequestRepository = new InMemoryRegistrationRequestRepository();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "NewTemp123!" });
  const sendAccountCredentialsEmail = vi.fn().mockResolvedValue(true);
  const useCase = new ResendRegistrationCredentialsUseCase({
    registrationRequestRepository,
    runCredentialsResetTransaction: async (fn) => ({
      result: await fn({ resetPassword, auditRecorder }),
      deferredNotifications: [],
    }),
    sendAccountCredentialsEmail,
    notificationService,
  });
  return { registrationRequestRepository, auditRecorder, resetPassword, sendAccountCredentialsEmail, useCase };
}

describe("ResendRegistrationCredentialsUseCase", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
    ctx.registrationRequestRepository.seed(approvedRequest());
  });

  it("resets and sends a new password only for the approved Student account", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, requestId: "request-1" });

    expect(ctx.resetPassword).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "user-student-1",
      targetRole: "STUDENT",
      targetBatchId: "batch-1",
    }));
    expect(ctx.sendAccountCredentialsEmail).toHaveBeenCalledWith({
      recipientName: "Student Name",
      recipientEmail: "student@example.edu",
      temporaryPassword: "NewTemp123!",
    });
    expect(result).toEqual({ tempPassword: "NewTemp123!", credentialsEmailSent: true });
    expect(ctx.auditRecorder.entries).toContainEqual(expect.objectContaining({
      action: AUDIT_ACTIONS.REGISTRATION_CREDENTIALS_RESENT,
      targetEntityType: "RegistrationRequest",
      targetEntityId: "request-1",
    }));
    expect(JSON.stringify(ctx.auditRecorder.entries)).not.toContain("NewTemp123!");
  });

  it("keeps the reset when post-commit email delivery fails", async () => {
    ctx.sendAccountCredentialsEmail.mockResolvedValueOnce(false);
    await expect(ctx.useCase.execute({ actor: SECRETARY, requestId: "request-1" })).resolves.toEqual({
      tempPassword: "NewTemp123!",
      credentialsEmailSent: false,
    });
    expect(ctx.resetPassword).toHaveBeenCalledTimes(1);
  });

  it("denies non-Secretary callers", async () => {
    await expect(ctx.useCase.execute({ actor: COORDINATOR, requestId: "request-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
    expect(ctx.resetPassword).not.toHaveBeenCalled();
  });

  it("does not reset a pending registration", async () => {
    ctx.registrationRequestRepository.seed({ ...approvedRequest(), id: "pending", status: "REVIEWED", resultingStudentProfileId: null });
    await expect(ctx.useCase.execute({ actor: SECRETARY, requestId: "pending" })).rejects.toBeInstanceOf(
      InvalidRegistrationTransitionError,
    );
    expect(ctx.resetPassword).not.toHaveBeenCalled();
  });
});
