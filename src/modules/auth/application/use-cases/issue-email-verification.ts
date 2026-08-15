import { generateOpaqueToken, hashOpaqueToken } from "@/lib/opaque-token";
import { renderEmailTemplate } from "@/modules/notifications/application/templates/render";
import type { RenderedEmailMessage } from "@/modules/notifications/application/ports/email-provider";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository";

/** Roadmap §2.4 — "verification expiry." 24 hours: long enough that a real applicant checking email the next morning isn't locked out, short enough that a stale, unconsumed token isn't a standing liability. */
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface IssueEmailVerificationTokenInput {
  readonly email: string;
  readonly recipientName: string;
  /** Set for RECRUITER/ALUMNI self-signup — a User already exists. */
  readonly userId?: string;
  /** Set for STUDENT registration — no User exists yet. Exactly one of userId/registrationRequestId is expected. */
  readonly registrationRequestId?: string;
}

export interface IssueEmailVerificationTokenUseCaseDeps {
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  /**
   * Injected rather than importing sendDirectEmail directly — mirrors
   * DecideRegistrationRequestUseCase's own `sendRejectionEmail` dependency,
   * and (specifically for this module) sidesteps a real circular import:
   * @/modules/notifications's public barrel re-exports IN_APP route
   * handlers that import `withAuth` from @/modules/auth's own barrel, so
   * anything inside auth reaching for that barrel — even just for a value
   * this pure — would load auth's own barrel through notifications', a
   * genuine cycle. See container.ts's real wiring (the deep infrastructure
   * import) for how this is resolved.
   */
  sendEmail: (message: RenderedEmailMessage) => Promise<void>;
  /** Resolved once in container.ts (getEnv().APP_BASE_URL) and injected, matching every other env-derived value in this module (e.g. refreshTokenTtlMs) — use cases never call getEnv() themselves. */
  appBaseUrl: string;
  /** getEnv().JWT_REFRESH_SECRET, reused for this HMAC too — see hashOpaqueToken's own doc comment for why it takes this as a parameter. */
  hashSecret: string;
}

/**
 * Shared by every self-signup/registration path that needs to prove control
 * of an email address (roadmap §2.4) — issues one token and sends one email,
 * regardless of which module called it. Deliberately sends the email
 * directly rather than through NotificationService.notify(): the verify URL
 * carries a one-time secret that must never be persisted into
 * Notification.payload/Job.payload — see emailVerificationTemplate's own
 * doc comment.
 */
export class IssueEmailVerificationTokenUseCase {
  constructor(private readonly deps: IssueEmailVerificationTokenUseCaseDeps) {}

  async execute(input: IssueEmailVerificationTokenInput): Promise<void> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken, this.deps.hashSecret);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.deps.emailVerificationTokenRepository.create({
      email: input.email,
      tokenHash,
      userId: input.userId,
      registrationRequestId: input.registrationRequestId,
      expiresAt,
    });

    const verifyUrl = `${this.deps.appBaseUrl}/verify-email?token=${rawToken}`;
    const rendered = renderEmailTemplate(
      "EMAIL_VERIFICATION",
      { recipientName: input.recipientName, verifyUrl },
      input.email,
    );
    await this.deps.sendEmail(rendered).catch((err: unknown) => {
      // Best-effort — matching every other notification dispatch in this
      // codebase (e.g. AdminResetPasswordUseCase's notify().catch()): a
      // delivery failure must never block the signup/registration itself,
      // which has already succeeded by this point. ResendEmailVerification
      // exists precisely so the applicant can recover from this. Logged
      // (never the token/URL) so a misconfigured/failing provider is
      // visible in server logs instead of silently vanishing.
      console.error("[auth] failed to send email-verification email", err);
    });
  }
}
