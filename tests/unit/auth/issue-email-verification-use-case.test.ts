import { describe, expect, it, vi } from "vitest";
import { IssueEmailVerificationTokenUseCase } from "../../../src/modules/auth/application/use-cases/issue-email-verification";
import { InMemoryEmailVerificationTokenRepository } from "../../support/fakes/in-memory-email-verification-token-repository";
import { hashOpaqueToken } from "../../../src/lib/opaque-token";

const TEST_HASH_SECRET = "b".repeat(32);

function buildUseCase() {
  const emailVerificationTokenRepository = new InMemoryEmailVerificationTokenRepository();
  const sendEmail = vi.fn().mockResolvedValue(undefined);
  const useCase = new IssueEmailVerificationTokenUseCase({
    emailVerificationTokenRepository,
    sendEmail,
    appBaseUrl: "https://myarch.example.edu",
    hashSecret: TEST_HASH_SECRET,
  });
  return { useCase, emailVerificationTokenRepository, sendEmail };
}

describe("IssueEmailVerificationTokenUseCase", () => {
  it("persists a token hash, never the raw token", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" });

    const [stored] = ctx.emailVerificationTokenRepository.all();
    expect(stored!.tokenHash).toBeTruthy();

    const [message] = ctx.sendEmail.mock.calls[0]!;
    const url = new URL(message.text.match(/https?:\/\/\S+/)![0]);
    const rawToken = url.searchParams.get("token")!;
    expect(stored!.tokenHash).toBe(hashOpaqueToken(rawToken, TEST_HASH_SECRET));
    expect(message.text).not.toContain(stored!.tokenHash);
  });

  it("binds the token to a userId for the self-signup case", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" });
    const [stored] = ctx.emailVerificationTokenRepository.all();
    expect(stored!.userId).toBe("user-1");
    expect(stored!.registrationRequestId).toBeNull();
  });

  it("binds the token to a registrationRequestId for the student-registration case", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "a@x.com", recipientName: "A", registrationRequestId: "req-1" });
    const [stored] = ctx.emailVerificationTokenRepository.all();
    expect(stored!.registrationRequestId).toBe("req-1");
    expect(stored!.userId).toBeNull();
  });

  it("sends the verification email to the given address", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" });
    expect(ctx.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com" }));
  });

  it("returns a safe delivery failure after persisting the verification token", async () => {
    const emailVerificationTokenRepository = new InMemoryEmailVerificationTokenRepository();
    const sendEmail = vi.fn().mockRejectedValue(new Error("smtp down"));
    const useCase = new IssueEmailVerificationTokenUseCase({
    emailVerificationTokenRepository,
    sendEmail,
    appBaseUrl: "https://myarch.example.edu",
    hashSecret: TEST_HASH_SECRET,
  });

    await expect(
      useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" }),
    ).resolves.toEqual({ emailSent: false });
    expect(emailVerificationTokenRepository.all()).toHaveLength(1);
  });

  it("returns a successful delivery result when transport accepts the email", async () => {
    const ctx = buildUseCase();
    await expect(
      ctx.useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" }),
    ).resolves.toEqual({ emailSent: true });
  });

  it("sets an expiry roughly 24 hours out", async () => {
    const ctx = buildUseCase();
    const before = Date.now();
    await ctx.useCase.execute({ email: "a@x.com", recipientName: "A", userId: "user-1" });
    const [stored] = ctx.emailVerificationTokenRepository.all();
    const ttlMs = stored!.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
  });
});
