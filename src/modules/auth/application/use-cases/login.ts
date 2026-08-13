import crypto from "node:crypto";
import type { AuthenticatedActor } from "../../domain/entities";
import { isReservedDemoAccountEmail } from "../../domain/demo-accounts";
import { InvalidCredentialsError } from "../../domain/errors";
import { issueSessionTokens } from "../issue-session";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { Clock } from "../ports/clock";
import type { PasswordHasher } from "../ports/password-hasher";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { TokenService } from "../ports/token-service";
import type { UserRepository } from "../ports/user-repository";

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  /** Raw refresh token — the Presentation layer sets this as an httpOnly cookie. Never logged. */
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly actor: AuthenticatedActor;
}

export interface LoginUseCaseDeps {
  userRepository: UserRepository;
  refreshTokenRepository: RefreshTokenRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  auditRecorder: AuditRecorder;
  clock: Clock;
  refreshTokenTtlMs: number;
}

export class LoginUseCase {
  constructor(private readonly deps: LoginUseCaseDeps) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    // Reserved demo accounts (see domain/demo-accounts.ts) are only ever
    // reachable through /api/auth/demo-login, which always issues a
    // read-only `isDemo: true` session. Treated identically to "no such
    // user" below (including the timing-safe dummy-hash comparison) so
    // ordinary password login can never mint a full, non-demo session for
    // one of these publicly-documented seed accounts.
    const user = isReservedDemoAccountEmail(normalizedEmail)
      ? null
      : await this.deps.userRepository.findByEmail(normalizedEmail);

    // Always run a real password comparison, even when no user is found,
    // against a precomputed dummy hash of matching cost — so response
    // timing does not reveal whether the email is registered
    // (docs/security/14_Security_Architecture.md).
    const hashToCompare = user?.passwordHash ?? this.deps.passwordHasher.dummyHash;
    const passwordMatches = await this.deps.passwordHasher.compare(input.password, hashToCompare);

    if (!user || !user.isActive || !passwordMatches) {
      if (user) {
        await this.deps.auditRecorder.record({
          actorUserId: user.id,
          action: "LOGIN_FAILED",
          targetEntityType: "User",
          targetEntityId: user.id,
        });
      }
      throw new InvalidCredentialsError();
    }

    const scope = await this.deps.userRepository.loadActorScope(user);
    const actor: AuthenticatedActor = {
      userId: user.id,
      role: user.role,
      ...scope,
      ...(user.mustChangePassword ? { mustChangePassword: true } : {}),
    };

    // Recorded now (post-credential-check, pre-token-issuance) so even a
    // same-millisecond forced-change redirect sees an up-to-date lastLoginAt.
    await this.deps.userRepository.recordSuccessfulLogin(user.id, this.deps.clock.now());

    // A new family per login — every rotation within this session shares it.
    const familyId = crypto.randomUUID();
    const tokens = await issueSessionTokens(this.deps, actor, familyId);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: "LOGIN_SUCCESS",
      targetEntityType: "User",
      targetEntityId: actor.userId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      actor,
    };
  }
}
