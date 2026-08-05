/**
 * Typed authentication errors (docs/20_Coding_Standards.md — no generic
 * thrown strings). The Presentation layer maps each of these to a specific
 * HTTP status/response; the Application layer never touches HTTP concerns.
 */

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Refresh token is invalid");
    this.name = "InvalidRefreshTokenError";
  }
}

export class RefreshTokenExpiredError extends Error {
  constructor() {
    super("Refresh token has expired");
    this.name = "RefreshTokenExpiredError";
  }
}

/**
 * Thrown when an already-rotated-out (or already-revoked) refresh token is
 * presented again — a signal of possible token theft. The use case that
 * throws this has already revoked the entire token family before throwing.
 * See docs/security/14_Security_Architecture.md, "Refresh Tokens: Rotation".
 */
export class RefreshTokenReusedError extends Error {
  constructor() {
    super("Refresh token reuse detected; session revoked");
    this.name = "RefreshTokenReusedError";
  }
}
