import { hashOpaqueToken } from "@/lib/opaque-token";
import { InvalidVerificationTokenError, VerificationTokenExpiredError } from "../../domain/errors";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository";
import type { UserRepository } from "../ports/user-repository";

export interface VerifyEmailInput {
  readonly token: string;
}

export interface VerifyEmailResult {
  readonly email: string;
  /** Non-null only for the RECRUITER/ALUMNI self-signup case — see EmailVerificationToken's dual shape. */
  readonly userId: string | null;
  /** Non-null only for the STUDENT registration case. The caller (the /api/auth/verify-email route, not this use case) is responsible for telling the registration module to mark its own request verified — see that route's own doc comment for why the cross-module step lives there instead of here. */
  readonly registrationRequestId: string | null;
}

export interface VerifyEmailUseCaseDeps {
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  userRepository: UserRepository;
  hashSecret: string;
}

/**
 * Public, unauthenticated (no account may even exist yet for the
 * registration-request case). Only ever touches auth's own tables directly
 * — EmailVerificationToken, and User.emailVerifiedAt when userId is set.
 * Deliberately does NOT import the registration module to update
 * RegistrationRequest.emailVerifiedAt itself: registration already depends
 * on auth (the established, one-way direction throughout this codebase —
 * see e.g. DecideRegistrationRequestUseCase's own use of
 * getAdminResetPasswordUseCase), so auth reaching back into registration
 * would create a real circular module dependency. The route handler, which
 * is free to import from both modules' public barrels, does that one step
 * instead.
 */
export class VerifyEmailUseCase {
  constructor(private readonly deps: VerifyEmailUseCaseDeps) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    const tokenHash = hashOpaqueToken(input.token, this.deps.hashSecret);
    const stored = await this.deps.emailVerificationTokenRepository.findByTokenHash(tokenHash);
    if (!stored) throw new InvalidVerificationTokenError();

    if (stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new VerificationTokenExpiredError();
    }

    await this.deps.emailVerificationTokenRepository.markConsumed(stored.id);

    if (stored.userId) {
      await this.deps.userRepository.markEmailVerified(stored.userId);
    }

    return {
      email: stored.email,
      userId: stored.userId,
      registrationRequestId: stored.registrationRequestId,
    };
  }
}
