import { beforeEach, describe, expect, it } from "vitest";
import { AdminResetPasswordUseCase } from "../../../src/modules/auth/application/use-cases/admin-reset-password";
import { UserNotFoundError } from "../../../src/modules/auth/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_SCOPED: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const COORDINATOR_UNSCOPED: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };
const STUDENT_ACTOR: AuthenticatedActor = { userId: "student-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const refreshTokenRepository = new InMemoryRefreshTokenRepository();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  const passwordHasher = new BcryptPasswordHasher(12);

  const useCase = new AdminResetPasswordUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher,
    auditRecorder,
    notificationService,
  });

  return { useCase, userRepository, refreshTokenRepository, auditRecorder, notificationService, passwordHasher };
}

describe("AdminResetPasswordUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "target-student",
      email: "student@example.edu",
      passwordHash: "original-hash",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
    ctx.userRepository.seed({
      id: "target-coordinator",
      email: "coordinator@example.edu",
      passwordHash: "original-hash",
      role: "COORDINATOR",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
    ctx.userRepository.seed({
      id: "target-recruiter",
      email: "recruiter@example.com",
      passwordHash: "original-hash",
      role: "RECRUITER",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
  });

  it("Secretary can reset a student's password (batch-scoped check passes for Secretary unconditionally)", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      targetUserId: "target-student",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice",
    });

    expect(result.tempPassword).toBeTruthy();
    expect(result.tempPassword.length).toBeGreaterThan(8);
  });

  it("a batch-scoped Coordinator can reset a student's password within their scope", async () => {
    await expect(
      ctx.useCase.execute({
        actor: COORDINATOR_SCOPED,
        targetUserId: "target-student",
        targetRole: "STUDENT",
        targetBatchId: "batch-a",
        recipientName: "Alice",
      }),
    ).resolves.toBeTruthy();
  });

  it("rejects a Coordinator resetting a student outside their batch scope", async () => {
    await expect(
      ctx.useCase.execute({
        actor: COORDINATOR_UNSCOPED,
        targetUserId: "target-student",
        targetRole: "STUDENT",
        targetBatchId: "batch-a",
        recipientName: "Alice",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects a student target with no targetBatchId provided", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "target-student",
        targetRole: "STUDENT",
        recipientName: "Alice",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("only a Secretary can reset a coordinator's password", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "target-coordinator",
        targetRole: "COORDINATOR",
        recipientName: "Arjun",
      }),
    ).resolves.toBeTruthy();

    await expect(
      ctx.useCase.execute({
        actor: COORDINATOR_SCOPED,
        targetUserId: "target-coordinator",
        targetRole: "COORDINATOR",
        recipientName: "Arjun",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("only a Secretary can reset a recruiter's password", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "target-recruiter",
        targetRole: "RECRUITER",
        recipientName: "Jordan",
      }),
    ).resolves.toBeTruthy();

    await expect(
      ctx.useCase.execute({
        actor: COORDINATOR_SCOPED,
        targetUserId: "target-recruiter",
        targetRole: "RECRUITER",
        recipientName: "Jordan",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("never permits resetting a Secretary's password through this path", async () => {
    ctx.userRepository.seed({
      id: "target-secretary",
      email: "other-secretary@example.edu",
      passwordHash: "original-hash",
      role: "SECRETARY",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });

    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "target-secretary",
        targetRole: "SECRETARY",
        recipientName: "Priya",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws UserNotFoundError for an unknown target user", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "does-not-exist",
        targetRole: "STUDENT",
        targetBatchId: "batch-a",
        recipientName: "Nobody",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("throws UserNotFoundError when the target's actual role does not match targetRole", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        targetUserId: "target-student",
        targetRole: "COORDINATOR",
        recipientName: "Alice",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("sets mustChangePassword true and a new password hash for the target", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      targetUserId: "target-student",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice",
    });

    const updated = await ctx.userRepository.findById("target-student");
    expect(updated!.mustChangePassword).toBe(true);
    expect(updated!.passwordHash).not.toBe("original-hash");
    await expect(ctx.passwordHasher.compare(result.tempPassword, updated!.passwordHash)).resolves.toBe(true);
  });

  it("revokes every existing session for the target user", async () => {
    await ctx.refreshTokenRepository.create({
      userId: "target-student",
      tokenHash: "some-hash",
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await ctx.useCase.execute({
      actor: SECRETARY,
      targetUserId: "target-student",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice",
    });

    const stillActive = ctx.refreshTokenRepository.all().filter((t) => t.userId === "target-student" && !t.revokedAt);
    expect(stillActive).toHaveLength(0);
  });

  it("records a PASSWORD_RESET audit entry attributed to the actor", async () => {
    await ctx.useCase.execute({
      actor: SECRETARY,
      targetUserId: "target-student",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice",
    });

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        actorUserId: "sec-1",
        action: "PASSWORD_RESET",
        targetEntityType: "User",
        targetEntityId: "target-student",
      }),
    );
  });

  it("sends a credentials-issued notification with no password in its context", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      targetUserId: "target-student",
      targetRole: "STUDENT",
      targetBatchId: "batch-a",
      recipientName: "Alice",
    });

    expect(ctx.notificationService.sent).toHaveLength(1);
    const sent = ctx.notificationService.sent[0]!;
    expect(sent.template).toBe("ACCOUNT_CREDENTIALS_ISSUED");
    expect(sent.recipientUserId).toBe("target-student");
    expect(Object.keys(sent.context)).not.toContain("password");
    expect(Object.keys(sent.context)).not.toContain("tempPassword");
    expect(JSON.stringify(sent.context)).not.toContain(result.tempPassword);
  });
});
