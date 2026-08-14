import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupRecruiterUseCase } from "../../../../src/modules/recruiters/application/use-cases/signup-recruiter";
import { DuplicateEmailError } from "../../../../src/modules/recruiters/domain/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeRecruiterUserProvisioner } from "../../../support/fakes/fake-recruiter-user-provisioner";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../../support/fakes/fake-notification-service";

function buildContext() {
  const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
  const recruiterUserProvisioner = new FakeRecruiterUserProvisioner();
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1", "sec-2"]) };
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const hashPassword = vi.fn().mockResolvedValue("hashed-password");
  const issueEmailVerificationToken = vi.fn().mockResolvedValue(undefined);

  const useCase = new SignupRecruiterUseCase({
    recruiterAccountRepository,
    recruiterUserProvisioner,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken,
  });

  return {
    useCase,
    recruiterAccountRepository,
    recruiterUserProvisioner,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken,
  };
}

const VALID_INPUT = {
  email: "recruiter@studio.com",
  fullName: "New Recruiter",
  companyName: "Studio Example",
  password: "SuperSecret!23",
};

describe("SignupRecruiterUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a PENDING recruiter account", async () => {
    const result = await ctx.useCase.execute(VALID_INPUT);
    expect(result.approvalStatus).toBe("PENDING");
    expect(result.fullName).toBe("New Recruiter");
  });

  it("hashes the caller-chosen password rather than generating a temp password", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.hashPassword).toHaveBeenCalledWith("SuperSecret!23");
  });

  it("rejects a duplicate email", async () => {
    ctx.recruiterUserProvisioner.seedExistingEmail("recruiter@studio.com");
    await expect(ctx.useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("issues an email verification token bound to the new userId", async () => {
    const result = await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.issueEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ email: "recruiter@studio.com", userId: result.userId }),
    );
  });

  it("notifies every active Secretary that a new account is pending review", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "sec-1",
        template: "ACCOUNT_SIGNUP_PENDING_REVIEW",
        context: { accountType: "RECRUITER", applicantName: "New Recruiter" },
      }),
    );
    expect(ctx.notificationService.sent).toContainEqual(expect.objectContaining({ recipientUserId: "sec-2" }));
  });

  it("records a RECRUITER_CREATED audit entry tagged as self-signup", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "RECRUITER_CREATED", metadata: expect.objectContaining({ selfSignup: true }) }),
    );
  });
});
