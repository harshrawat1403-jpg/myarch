import type { AuthenticatedActor } from "../domain/entities";
import type { Clock } from "./ports/clock";
import type { RefreshTokenRepository } from "./ports/refresh-token-repository";
import type { TokenService } from "./ports/token-service";

export interface IssueSessionTokensDeps {
  tokenService: TokenService;
  refreshTokenRepository: RefreshTokenRepository;
  clock: Clock;
  refreshTokenTtlMs: number;
}

export interface IssuedSessionTokens {
  readonly accessToken: string;
  /** Raw refresh token — callers set this as an httpOnly cookie. Never logged. */
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  /** The newly-created RefreshToken row's id — needed by callers that must link a prior token's `replacedById` to this one (rotation). */
  readonly refreshTokenRecordId: string;
}

/**
 * Signs a fresh access token and creates the backing refresh-token record
 * for a given actor + session family. Shared by LoginUseCase (new family),
 * RefreshAccessTokenUseCase (same family, caller also revokes the presented
 * token afterward), and ChangeOwnPasswordUseCase (new family, since a
 * password change starts a fresh session on the current device after
 * revoking every other one) — extracted once a third caller needed the
 * identical token-issuance sequence, rather than duplicated a third time.
 */
export async function issueSessionTokens(
  deps: IssueSessionTokensDeps,
  actor: AuthenticatedActor,
  familyId: string,
): Promise<IssuedSessionTokens> {
  const accessToken = deps.tokenService.signAccessToken({
    sub: actor.userId,
    role: actor.role,
    batchScope: actor.batchScope,
    studentProfileId: actor.studentProfileId,
    mustChangePassword: actor.mustChangePassword,
  });

  const rawRefreshToken = deps.tokenService.generateRefreshToken();
  const tokenHash = deps.tokenService.hashRefreshToken(rawRefreshToken);
  const now = deps.clock.now();
  const refreshTokenExpiresAt = new Date(now.getTime() + deps.refreshTokenTtlMs);

  const stored = await deps.refreshTokenRepository.create({
    userId: actor.userId,
    tokenHash,
    familyId,
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    refreshTokenExpiresAt,
    refreshTokenRecordId: stored.id,
  };
}
