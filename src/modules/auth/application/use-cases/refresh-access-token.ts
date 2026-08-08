import type { AuthenticatedActor } from "../../domain/entities";
import {
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenReusedError,
} from "../../domain/errors";
import { issueSessionTokens } from "../issue-session";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { Clock } from "../ports/clock";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { TokenService } from "../ports/token-service";
import type { UserRepository } from "../ports/user-repository";

export interface RefreshInput {
  readonly refreshToken: string;
}

export interface RefreshResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly actor: AuthenticatedActor;
}

export interface RefreshAccessTokenUseCaseDeps {
  userRepository: UserRepository;
  refreshTokenRepository: RefreshTokenRepository;
  tokenService: TokenService;
  auditRecorder: AuditRecorder;
  clock: Clock;
  refreshTokenTtlMs: number;
}

export class RefreshAccessTokenUseCase {
  constructor(private readonly deps: RefreshAccessTokenUseCaseDeps) {}

  async execute(input: RefreshInput): Promise<RefreshResult> {
    const tokenHash = this.deps.tokenService.hashRefreshToken(input.refreshToken);
    const stored = await this.deps.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    if (stored.revokedAt) {
      // Reuse of a token that was already rotated out (or already logged
      // out) — treat as possible theft and kill the whole session family,
      // per docs/security/14_Security_Architecture.md's rotation-reuse
      // requirement.
      await this.deps.refreshTokenRepository.revokeFamily(stored.familyId);
      await this.deps.auditRecorder.record({
        actorUserId: stored.userId,
        action: "REFRESH_TOKEN_REUSE_DETECTED",
        targetEntityType: "User",
        targetEntityId: stored.userId,
      });
      throw new RefreshTokenReusedError();
    }

    const now = this.deps.clock.now();
    if (stored.expiresAt.getTime() <= now.getTime()) {
      throw new RefreshTokenExpiredError();
    }

    const user = await this.deps.userRepository.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    const scope = await this.deps.userRepository.loadActorScope(user);
    const actor: AuthenticatedActor = {
      userId: user.id,
      role: user.role,
      ...scope,
      ...(user.mustChangePassword ? { mustChangePassword: true } : {}),
    };

    // Rotate: same family as the presented token, which is retired and
    // linked to its replacement once the new one exists.
    const tokens = await issueSessionTokens(this.deps, actor, stored.familyId);
    await this.deps.refreshTokenRepository.revoke(stored.id, tokens.refreshTokenRecordId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      actor,
    };
  }
}
