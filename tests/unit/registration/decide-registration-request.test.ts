import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecideRegistrationRequestUseCase } from "../../../src/modules/registration/application/use-cases/decide-registration-request";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  InvalidRegistrationTransitionError,
  RegistrationEmailNotVerifiedError,
  RegistrationRequestNotFoundError,
} from "../../../src/modules/registration/domain/errors";
import { DuplicateEmailError, DuplicateRollNumberError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRegistrationRequestRepository } from "../../support/fakes/in-memory-registration-request-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RegistrationRequestRecord } from "../../../src/modules/registration";

const BATCH_A = "batch-a";
const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = {
  userId: "coord-1",
  role: "COORDINATOR",
  batchScope: [BATCH_A],
};

function makeRecord(overrides: Partial<RegistrationRequestRecord> = {}): RegistrationRequestRecord {
  const now = new Date();
  return {
    id: "req-1",
    email: "prospective@example.com",
    fullName: "Priya New Student",
    rollNumber: "BA2027099",
    batchId: BATCH_A,
    submittedData: { phone: "9876543210", personalEmail: "priya.personal@example.com" },
    status: "REVIEWED",
    // MYARCH Phase 1: this fixture represents a request that's ready to be
    // decided — verified by default, matching status: "REVIEWED" already
    // being the "ready" default. The RegistrationEmailNotVerifiedError-
    // specific tests below override this explicitly.
    emailVerifiedAt: now,
    coordinatorComment: "Looks good.",
    reviewedByUserId: "coord-1",
    reviewedAt: now,
    decidedByUserId: null,
    decidedAt: null,
    rejectionReason: null,
    resultingStudentProfileId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext() {
  const repo = new InMemoryRegistrationRequestRepository();
  const auditRecorder = new FakeAuditRecorder();
  const createStudent = vi.fn().mockResolvedValue({
    id: "student-1",
    userId: "user-1",
    batchId: BATCH_A,
    rollNumber: "BA2027099",
    fullName: "Priya New Student",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    private: {},
  });
  const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "Temp1234!" });
  const sendRejectionEmail = vi.fn().mockResolvedValue(undefined);
  const notificationService = new FakeNotificationService();

  // Fake stand-in for the real prisma.$transaction-backed implementation
  // (container.ts's runApproveTransaction): just invokes the callback with
  // these same fakes, with no real transaction/rollback semantics — good
  // enough to unit-test the use case's own orchestration and error mapping,
  // while the transaction/rollback behavior itself is Prisma's own
  // responsibility, not this use case's.
  const useCase = new DecideRegistrationRequestUseCase({
    registrationRequestRepository: repo,
    runApproveTransaction: async (fn) => {
      const result = await fn({
        createStudent,
        resetPassword,
        registrationRequestRepository: repo,
        auditRecorder,
      });
      return { result, deferredNotifications: [] };
    },
    sendRejectionEmail,
    auditRecorder,
    notificationService,
  });

  return {
    repo,
    auditRecorder,
    createStudent,
    resetPassword,
    sendRejectionEmail,
    notificationService,
    useCase,
  };
}

describe("DecideRegistrationRequestUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
    ctx.repo.seed(makeRecord());
  });

  it("denies a Coordinator (Q1: Secretary is the sole final approval authority)", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, requestId: "req-1", decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    expect(ctx.createStudent).not.toHaveBeenCalled();
  });

  it("throws RegistrationRequestNotFoundError for an unknown id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, requestId: "missing", decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(RegistrationRequestNotFoundError);
  });

  it("rejects deciding an already-decided request", async () => {
    ctx.repo.seed(makeRecord({ id: "decided-1", status: "APPROVED" }));
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, requestId: "decided-1", decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(InvalidRegistrationTransitionError);
  });

  it("rejects APPROVE while the applicant's email is still unverified (roadmap §2.4)", async () => {
    ctx.repo.seed(makeRecord({ id: "unverified-1", emailVerifiedAt: null }));
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, requestId: "unverified-1", decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(RegistrationEmailNotVerifiedError);
    expect(ctx.createStudent).not.toHaveBeenCalled();
  });

  it("allows REJECT regardless of email verification (rejecting never creates an account)", async () => {
    ctx.repo.seed(makeRecord({ id: "unverified-2", emailVerifiedAt: null }));
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      requestId: "unverified-2",
      decision: "REJECT",
      rejectionReason: "Not eligible.",
    });
    expect(result.request.status).toBe("REJECTED");
  });

  describe("APPROVE", () => {
    it("calls createStudent with the request's own data (self-reported fields carried through, never retyped)", async () => {
      await ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" });

      expect(ctx.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: SECRETARY,
          email: "prospective@example.com",
          fullName: "Priya New Student",
          rollNumber: "BA2027099",
          batchId: BATCH_A,
          private: { phone: "9876543210", personalEmail: "priya.personal@example.com" },
        }),
      );
    });

    it("calls resetPassword for the newly created account and returns the reveal-once tempPassword", async () => {
      const result = await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "APPROVE",
      });

      expect(ctx.resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: "user-1",
          targetRole: "STUDENT",
          targetBatchId: BATCH_A,
        }),
      );
      expect(result.tempPassword).toBe("Temp1234!");
    });

    it("marks the request APPROVED with the resulting studentProfileId", async () => {
      const result = await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "APPROVE",
      });
      expect(result.request.status).toBe("APPROVED");
      expect(result.request.resultingStudentProfileId).toBe("student-1");
    });

    it("records a REGISTRATION_REQUEST_APPROVED audit entry", async () => {
      await ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" });
      expect(ctx.auditRecorder.entries).toContainEqual(
        expect.objectContaining({ actorUserId: "sec-1", action: "REGISTRATION_REQUEST_APPROVED" }),
      );
    });

    it("V4.0 E2 — notifies the new account of the approval decision (REGISTRATION_DECIDED)", async () => {
      await ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" });
      expect(ctx.notificationService.sent).toContainEqual(
        expect.objectContaining({
          recipientUserId: "user-1",
          template: "REGISTRATION_DECIDED",
          context: { applicantName: "Priya New Student", decision: "APPROVED" },
        }),
      );
    });

    it("translates a duplicate-email collision from CreateStudentUseCase into the registration module's own error", async () => {
      ctx.createStudent.mockRejectedValueOnce(new DuplicateEmailError("prospective@example.com"));
      await expect(
        ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" }),
      ).rejects.toBeInstanceOf(DuplicateRegistrationEmailError);
    });

    it("translates a duplicate-roll-number collision from CreateStudentUseCase into the registration module's own error", async () => {
      ctx.createStudent.mockRejectedValueOnce(new DuplicateRollNumberError("BA2027099"));
      await expect(
        ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" }),
      ).rejects.toBeInstanceOf(DuplicateRegistrationRollNumberError);
    });

    it("never marks the request decided or sends a notification when createStudent fails (nothing to roll back)", async () => {
      ctx.createStudent.mockRejectedValueOnce(new DuplicateEmailError("prospective@example.com"));
      await expect(
        ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" }),
      ).rejects.toBeInstanceOf(DuplicateRegistrationEmailError);

      expect(ctx.resetPassword).not.toHaveBeenCalled();
      const stillPending = await ctx.repo.findById("req-1");
      expect(stillPending?.status).toBe("REVIEWED");
      expect(ctx.notificationService.sent).toHaveLength(0);
    });

    it("V4.1 — a failure after the account is created still leaves the request re-decidable, not silently orphaned (closes the non-atomic APPROVE bug)", async () => {
      // The whole point of runApproveTransaction being one atomic unit: if
      // resetPassword fails after createStudent has already "succeeded"
      // inside the same transaction, the real prisma.$transaction rolls
      // both back together. This fake can't exercise Postgres rollback
      // directly, but it does prove the use case itself never treats a
      // mid-transaction failure as a partial success — it propagates the
      // error, never calls decide(), and never notifies anyone.
      ctx.resetPassword.mockRejectedValueOnce(new Error("temp password generation failed"));

      await expect(
        ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVE" }),
      ).rejects.toThrow("temp password generation failed");

      const stillPending = await ctx.repo.findById("req-1");
      expect(stillPending?.status).toBe("REVIEWED");
      expect(stillPending?.resultingStudentProfileId).toBeNull();
      expect(ctx.notificationService.sent).toHaveLength(0);
    });
  });

  describe("REJECT", () => {
    it("requires a rejection reason", async () => {
      await expect(
        ctx.useCase.execute({ actor: SECRETARY, requestId: "req-1", decision: "REJECT" }),
      ).rejects.toBeInstanceOf(InvalidRegistrationTransitionError);
      expect(ctx.createStudent).not.toHaveBeenCalled();
    });

    it("marks the request REJECTED with the reason, never calling createStudent (no account before approval)", async () => {
      const result = await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "REJECT",
        rejectionReason: "Roll number does not match department records.",
      });
      expect(result.request.status).toBe("REJECTED");
      expect(result.request.rejectionReason).toBe("Roll number does not match department records.");
      expect(result.tempPassword).toBeUndefined();
      expect(ctx.createStudent).not.toHaveBeenCalled();
      expect(ctx.resetPassword).not.toHaveBeenCalled();
    });

    it("sends a direct rejection email to the applicant (no account exists to notify through the normal path)", async () => {
      await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "REJECT",
        rejectionReason: "Roll number mismatch.",
      });
      expect(ctx.sendRejectionEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "prospective@example.com" }),
      );
    });

    it("V4.0 E2 — the rejection email is rendered from the real REGISTRATION_DECIDED template, carrying the real reason", async () => {
      await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "REJECT",
        rejectionReason: "Roll number mismatch.",
      });
      const [message] = ctx.sendRejectionEmail.mock.calls[0]!;
      expect(message.text).toContain("Roll number mismatch.");
      expect(message.html).toContain("Roll number mismatch.");
      // Never sent through notify()/NotificationService — no account exists yet.
      expect(ctx.notificationService.sent).toHaveLength(0);
    });

    it("records a REGISTRATION_REQUEST_REJECTED audit entry", async () => {
      await ctx.useCase.execute({
        actor: SECRETARY,
        requestId: "req-1",
        decision: "REJECT",
        rejectionReason: "x",
      });
      expect(ctx.auditRecorder.entries).toContainEqual(
        expect.objectContaining({ actorUserId: "sec-1", action: "REGISTRATION_REQUEST_REJECTED" }),
      );
    });
  });
});
