import { generateOpaqueToken, hashOpaqueToken } from "@/lib/opaque-token";
import { renderEmailTemplate } from "@/modules/notifications/application/templates/render";
import type { RenderedEmailMessage } from "@/modules/notifications/application/ports/email-provider";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface ResendEmailVerificationInput {
  readonly email: string;
}

export interface ResendEmailVerificationUseCaseDeps {
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  /** Injected — see IssueEmailVerificationTokenUseCase's own doc comment for why this can't be a direct import of sendDirectEmail. */
  sendEmail: (message: RenderedEmailMessage) => Promise<void>;
  appBaseUrl: string;
  hashSecret: string;
}

/**
 * Public, unauthenticated, and deliberately silent either way — the caller
 * (route handler) always returns the same generic "if that email has a
 * pending verification, we've resent it" response regardless of what
 * actually happened here, so this can never be used to enumerate which
 * emails have signed up (the same anti-enumeration principle LoginUseCase's
 * timing-safe dummy-hash comparison already establishes for login).
 *
 * Re-issues a fresh token bound to the SAME target (userId or
 * registrationRequestId) the original token was for — found by looking at
 * EmailVerificationToken alone (see findLatestByEmail's own doc comment for
 * why this never needs to query User or RegistrationRequest directly,
 * avoiding the cross-module dependency VerifyEmailUseCase's own doc comment
 * explains).
 */
export class ResendEmailVerificationUseCase {
  constructor(private readonly deps: ResendEmailVerificationUseCaseDeps) {}

  async execute(input: ResendEmailVerificationInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const latest = await this.deps.emailVerificationTokenRepository.findLatestByEmail(email);

    // Nothing ever signed up with this email, or it's already verified —
    // silently do nothing either way (anti-enumeration).
    if (!latest || latest.consumedAt) return;

    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken, this.deps.hashSecret);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.deps.emailVerificationTokenRepository.create({
      email,
      tokenHash,
      userId: latest.userId ?? undefined,
      registrationRequestId: latest.registrationRequestId ?? undefined,
      expiresAt,
    });

    const verifyUrl = `${this.deps.appBaseUrl}/verify-email?token=${rawToken}`;
    const rendered = renderEmailTemplate("EMAIL_VERIFICATION", { verifyUrl }, email);
    // Best-effort, matching IssueEmailVerificationTokenUseCase — logged
    // (never the token/URL) so a misconfigured/failing provider is visible
    // in server logs instead of silently vanishing.
    await this.deps.sendEmail(rendered).catch(() => {
      console.error("[auth] email-verification delivery failed");
    });
  }
}
