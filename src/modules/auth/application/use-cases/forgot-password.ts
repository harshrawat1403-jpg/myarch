import { generateOpaqueToken, hashOpaqueToken } from "@/lib/opaque-token";
import { renderEmailTemplate } from "@/modules/notifications/application/templates/render";
import type { RenderedEmailMessage } from "@/modules/notifications/application/ports/email-provider";
import type { PasswordResetTokenRepository } from "../ports/password-reset-token-repository";
import type { UserRepository } from "../ports/user-repository";

/** Roadmap §2.4. Deliberately much shorter than the 24h email-verification TTL — a password-reset link is higher-stakes (it grants account access, not just proves an address is reachable). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface ForgotPasswordInput {
  readonly email: string;
}

export interface ForgotPasswordUseCaseDeps {
  userRepository: UserRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  /** Injected — see IssueEmailVerificationTokenUseCase's own doc comment for why this can't be a direct import of sendDirectEmail. */
  sendEmail: (message: RenderedEmailMessage) => Promise<void>;
  appBaseUrl: string;
  hashSecret: string;
}

/**
 * Public, unauthenticated, and always resolves the same way regardless of
 * whether the email belongs to a real account — the route handler always
 * returns the same generic "if that email exists, we've sent a reset link"
 * message. Same anti-enumeration principle as LoginUseCase's timing-safe
 * dummy-hash comparison and ResendEmailVerificationUseCase's own doc
 * comment.
 */
export class ForgotPasswordUseCase {
  constructor(private readonly deps: ForgotPasswordUseCaseDeps) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const user = await this.deps.userRepository.findByEmail(email);

    // No account, or a disabled one — say nothing, do nothing. A disabled
    // account being reset would let its holder straight back in, defeating
    // the disable.
    if (!user || !user.isActive) return;

    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken, this.deps.hashSecret);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.deps.passwordResetTokenRepository.create({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${this.deps.appBaseUrl}/reset-password?token=${rawToken}`;
    const rendered = renderEmailTemplate("PASSWORD_RESET_REQUESTED", { resetUrl }, email);
    // Best-effort, matching every other direct-send call site in this
    // module — the token is already stored, so a delivery failure must
    // never surface here (would break anti-enumeration). Logged (never the
    // token/URL) so a misconfigured/failing provider is at least visible in
    // server logs instead of silently vanishing.
    await this.deps.sendEmail(rendered).catch((err: unknown) => {
      console.error("[auth] failed to send password-reset email", err);
    });
  }
}
