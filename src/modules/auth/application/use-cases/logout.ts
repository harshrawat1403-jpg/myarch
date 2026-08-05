import type { AuditRecorder } from "../ports/audit-recorder";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { TokenService } from "../ports/token-service";

export interface LogoutInput {
  /** Raw refresh token from the httpOnly cookie; absent if already logged out. */
  readonly refreshToken: string | undefined;
}

export interface LogoutUseCaseDeps {
  refreshTokenRepository: RefreshTokenRepository;
  tokenService: TokenService;
  auditRecorder: AuditRecorder;
}

export class LogoutUseCase {
  constructor(private readonly deps: LogoutUseCaseDeps) {}

  /**
   * Logout is idempotent by design: presenting no token, an already-revoked
   * token, or an unknown token all end in the same "nothing left to do"
   * outcome rather than an error — there is no session left to protect
   * either way, and returning an error here would provide no security
   * benefit while making a very ordinary UI action (clicking "log out"
   * twice) feel broken.
   */
  async execute(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) return;

    const tokenHash = this.deps.tokenService.hashRefreshToken(input.refreshToken);
    const stored = await this.deps.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored) return;

    // Revoke the whole family, not just this token — ends the session
    // entirely (docs/security/14_Security_Architecture.md: "Logout
    // invalidates the refresh token server-side immediately").
    await this.deps.refreshTokenRepository.revokeFamily(stored.familyId);

    await this.deps.auditRecorder.record({
      actorUserId: stored.userId,
      action: "LOGOUT",
      targetEntityType: "User",
      targetEntityId: stored.userId,
    });
  }
}
