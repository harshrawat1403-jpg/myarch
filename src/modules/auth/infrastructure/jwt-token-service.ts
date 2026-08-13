import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "../domain/entities";
import type { AccessTokenClaims, TokenService } from "../application/ports/token-service";

const VALID_ROLES: readonly Role[] = ["SECRETARY", "COORDINATOR", "STUDENT", "RECRUITER"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

export interface JwtTokenServiceConfig {
  accessSecret: string;
  /** e.g. "15m" — passed straight through to jsonwebtoken's `expiresIn`. */
  accessTtl: string;
  /** Server-held key for HMAC-hashing refresh tokens; distinct from accessSecret. */
  refreshHashSecret: string;
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(
      {
        role: claims.role,
        batchScope: claims.batchScope,
        studentProfileId: claims.studentProfileId,
        mustChangePassword: claims.mustChangePassword,
        isDemo: claims.isDemo,
      },
      this.config.accessSecret,
      {
        subject: claims.sub,
        expiresIn: this.config.accessTtl as jwt.SignOptions["expiresIn"],
        algorithm: "HS256",
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    // jwt.verify throws TokenExpiredError / JsonWebTokenError on any
    // invalid, malformed, or expired token — left to propagate. The auth
    // middleware treats any throw from this method as "unauthenticated."
    // `algorithms` is pinned explicitly (rather than relying on
    // jsonwebtoken's default inference from the key type) so this can never
    // be widened to accept an unexpected algorithm — the classic JWT
    // "algorithm confusion" class of vulnerability — regardless of how the
    // underlying library's defaults behave across versions.
    const decoded = jwt.verify(token, this.config.accessSecret, { algorithms: ["HS256"] });

    if (typeof decoded === "string" || !decoded.sub || !isRole(decoded["role"])) {
      throw new Error("Malformed access token payload");
    }

    return {
      sub: decoded.sub,
      role: decoded["role"],
      batchScope: decoded["batchScope"] as readonly string[] | undefined,
      studentProfileId: decoded["studentProfileId"] as string | undefined,
      mustChangePassword: decoded["mustChangePassword"] as boolean | undefined,
      isDemo: decoded["isDemo"] as boolean | undefined,
    };
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  hashRefreshToken(raw: string): string {
    return crypto.createHmac("sha256", this.config.refreshHashSecret).update(raw).digest("hex");
  }
}
