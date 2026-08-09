import { beforeEach, describe, expect, it } from "vitest";
import { UpdateOwnProfileUseCase } from "../../../src/modules/auth/application/use-cases/update-own-profile";
import { CurrentPasswordIncorrectError, EmailAlreadyInUseError } from "../../../src/modules/auth/domain/errors";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { FakeProfileNameRepository } from "../../support/fakes/fake-profile-name-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const ACTOR: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const profileNameRepository = new FakeProfileNameRepository();
  const auditRecorder = new FakeAuditRecorder();
  const passwordHasher = new BcryptPasswordHasher(12);

  const useCase = new UpdateOwnProfileUseCase({
    userRepository,
    profileNameRepository,
    passwordHasher,
    auditRecorder,
  });

  return { useCase, userRepository, profileNameRepository, auditRecorder, passwordHasher };
}

describe("UpdateOwnProfileUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(async () => {
    ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "sec-1",
      email: "secretary@tnparch.in",
      passwordHash: await ctx.passwordHasher.hash("current-password"),
      role: "SECRETARY",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
  });

  it("updates the display name without requiring a password", async () => {
    await ctx.useCase.execute({ actor: ACTOR, fullName: "New Name" });

    expect(ctx.profileNameRepository.updates).toContainEqual({
      userId: "sec-1",
      role: "SECRETARY",
      fullName: "New Name",
    });
  });

  it("rejects an email change with no current password", async () => {
    await expect(
      ctx.useCase.execute({ actor: ACTOR, email: "new@tnparch.in" }),
    ).rejects.toBeInstanceOf(CurrentPasswordIncorrectError);
  });

  it("rejects an email change with the wrong current password", async () => {
    await expect(
      ctx.useCase.execute({ actor: ACTOR, email: "new@tnparch.in", currentPassword: "wrong" }),
    ).rejects.toBeInstanceOf(CurrentPasswordIncorrectError);
  });

  it("updates the email with the correct current password", async () => {
    const result = await ctx.useCase.execute({
      actor: ACTOR,
      email: "new@tnparch.in",
      currentPassword: "current-password",
    });

    expect(result.email).toBe("new@tnparch.in");
    const updated = await ctx.userRepository.findById("sec-1");
    expect(updated!.email).toBe("new@tnparch.in");
  });

  it("rejects an email already in use by another account", async () => {
    ctx.userRepository.seed({
      id: "other-user",
      email: "taken@tnparch.in",
      passwordHash: "irrelevant",
      role: "COORDINATOR",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });

    await expect(
      ctx.useCase.execute({ actor: ACTOR, email: "taken@tnparch.in", currentPassword: "current-password" }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it("allows 'changing' the email to the same value it already is, without requiring a password", async () => {
    await expect(
      ctx.useCase.execute({ actor: ACTOR, email: "secretary@tnparch.in" }),
    ).resolves.toEqual({ email: "secretary@tnparch.in" });
  });

  it("records an ACCOUNT_SETTINGS_UPDATED audit entry", async () => {
    await ctx.useCase.execute({ actor: ACTOR, fullName: "New Name" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "ACCOUNT_SETTINGS_UPDATED" }),
    );
  });

  it("updates the display name for a Student actor too (V4.0 A3: Account Settings now serves Students as well)", async () => {
    ctx.userRepository.seed({
      id: "stu-1",
      email: "alice@vnit.ac.in",
      passwordHash: "irrelevant",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });

    await ctx.useCase.execute({ actor: { userId: "stu-1", role: "STUDENT" }, fullName: "Alice A. Architect" });

    expect(ctx.profileNameRepository.updates).toContainEqual({
      userId: "stu-1",
      role: "STUDENT",
      fullName: "Alice A. Architect",
    });
  });

  it("updates both fullName and email in one call", async () => {
    await ctx.useCase.execute({
      actor: ACTOR,
      fullName: "New Name",
      email: "new@tnparch.in",
      currentPassword: "current-password",
    });

    expect(ctx.profileNameRepository.updates).toContainEqual({
      userId: "sec-1",
      role: "SECRETARY",
      fullName: "New Name",
    });
    const updated = await ctx.userRepository.findById("sec-1");
    expect(updated!.email).toBe("new@tnparch.in");
  });
});
