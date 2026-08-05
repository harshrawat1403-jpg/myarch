import crypto from "node:crypto";
import type { AuthenticatedActor } from "../../domain/entities";
import { InvalidCredentialsError } from "../../domain/errors";
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
    const user = await this.deps.userRepository.findByEmail(normalizedEmail);

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
    const actor: AuthenticatedActor = { userId: user.id, role: user.role, ...scope };

    const accessToken = this.deps.tokenService.signAccessToken({
      sub: actor.userId,
      role: actor.role,
      batchScope: actor.batchScope,
      studentProfileId: actor.studentProfileId,
    });

    const rawRefreshToken = this.deps.tokenService.generateRefreshToken();
    const tokenHash = this.deps.tokenService.hashRefreshToken(rawRefreshToken);
    const now = this.deps.clock.now();
    const refreshTokenExpiresAt = new Date(now.getTime() + this.deps.refreshTokenTtlMs);

    // A new family per login — every rotation within this session shares it.
    const familyId = crypto.randomUUID();
    await this.deps.refreshTokenRepository.create({
      userId: actor.userId,
      tokenHash,
      familyId,
      expiresAt: refreshTokenExpiresAt,
    });

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: "LOGIN_SUCCESS",
      targetEntityType: "User",
      targetEntityId: actor.userId,
    });

    return { accessToken, refreshToken: rawRefreshToken, refreshTokenExpiresAt, actor };
  }
}
