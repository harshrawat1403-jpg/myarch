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

/** V3.0 Administration Platform: self-service password change with a wrong current password. */
export class CurrentPasswordIncorrectError extends Error {
  constructor() {
    super("Current password is incorrect");
    this.name = "CurrentPasswordIncorrectError";
  }
}

/** V3.0: the new password must differ from the current one. */
export class NewPasswordSameAsCurrentError extends Error {
  constructor() {
    super("New password must be different from your current password");
    this.name = "NewPasswordSameAsCurrentError";
  }
}

/** V3.0: AdminResetPasswordUseCase, target user not found. */
export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

/** V3.0 Account Settings: self-service email change to an address already in use. */
export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("This email address is already in use");
    this.name = "EmailAlreadyInUseError";
  }
}

/** V3.0 Account Settings: an avatar upload outside the allowed MIME types or size ceiling. */
export class InvalidAvatarFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAvatarFileError";
  }
}

/** MYARCH Phase 1 — VerifyEmailUseCase, the presented token doesn't match any issued token (never issued, or a garbage value). */
export class InvalidVerificationTokenError extends Error {
  constructor() {
    super("This verification link is invalid");
    this.name = "InvalidVerificationTokenError";
  }
}

/** MYARCH Phase 1 — VerifyEmailUseCase, a real but already-consumed or expired token. */
export class VerificationTokenExpiredError extends Error {
  constructor() {
    super("This verification link has expired or was already used. Request a new one.");
    this.name = "VerificationTokenExpiredError";
  }
}

/** MYARCH Phase 1 — ResetPasswordUseCase, the presented token doesn't match any issued token. */
export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super("This password reset link is invalid");
    this.name = "InvalidPasswordResetTokenError";
  }
}

/** MYARCH Phase 1 — ResetPasswordUseCase, a real but already-consumed or expired token. */
export class PasswordResetTokenExpiredError extends Error {
  constructor() {
    super("This password reset link has expired or was already used. Request a new one.");
    this.name = "PasswordResetTokenExpiredError";
  }
}
