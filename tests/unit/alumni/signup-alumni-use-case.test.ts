import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/signup-alumni";
import { DuplicateEmailError } from "../../../src/modules/alumni/domain/errors";
import { InMemoryAlumniRepository } from "../../support/fakes/in-memory-alumni-repository";
import { FakeAlumniUserProvisioner } from "../../support/fakes/fake-alumni-user-provisioner";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

function buildContext() {
  const alumniRepository = new InMemoryAlumniRepository();
  const alumniUserProvisioner = new FakeAlumniUserProvisioner();
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1", "sec-2"]) };
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const hashPassword = vi.fn().mockResolvedValue("hashed-password");
  const issueEmailVerificationToken = vi.fn().mockResolvedValue(undefined);

  const useCase = new SignupAlumniUseCase({
    alumniRepository,
    alumniUserProvisioner,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken,
  });

  return {
    useCase,
    alumniRepository,
    alumniUserProvisioner,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken,
  };
}

const VALID_INPUT = {
  email: "alum@example.com",
  fullName: "New Alumnus",
  graduationYear: 2021,
  password: "SuperSecret!23",
};

describe("SignupAlumniUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a PENDING alumni account", async () => {
    const result = await ctx.useCase.execute(VALID_INPUT);
    expect(result.approvalStatus).toBe("PENDING");
    expect(result.fullName).toBe("New Alumnus");
  });

  it("hashes the caller-chosen password rather than generating a temp password", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.hashPassword).toHaveBeenCalledWith("SuperSecret!23");
  });

  it("rejects a duplicate email", async () => {
    ctx.alumniUserProvisioner.seedExistingEmail("alum@example.com");
    await expect(ctx.useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("issues an email verification token bound to the new userId", async () => {
    const result = await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.issueEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alum@example.com", userId: result.userId }),
    );
  });

  it("notifies every active Secretary that a new account is pending review", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "sec-1",
        template: "ACCOUNT_SIGNUP_PENDING_REVIEW",
        context: { accountType: "ALUMNI", applicantName: "New Alumnus" },
      }),
    );
    expect(ctx.notificationService.sent).toContainEqual(expect.objectContaining({ recipientUserId: "sec-2" }));
  });

  it("records an ALUMNI_CREATED audit entry tagged as self-signup", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "ALUMNI_CREATED", metadata: expect.objectContaining({ selfSignup: true }) }),
    );
  });
});
