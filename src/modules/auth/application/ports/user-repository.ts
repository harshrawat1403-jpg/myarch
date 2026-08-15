import type { AuthenticatedActor, Role } from "../../domain/entities";

/**
 * The subset of a User record the auth module needs. Intentionally narrower
 * than the full Prisma User model (Interface Segregation) — this port has no
 * business needing profile data, only identity and role.
 */
export interface AuthUserRecord {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly avatarFileId: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;

  /**
   * Resolves the role-specific scope needed to build an AuthenticatedActor
   * (a Coordinator's assigned batch IDs, or a Student's own profile ID).
   * Secretary and Recruiter carry no such scope in Phase 1.
   */
  loadActorScope(
    user: AuthUserRecord,
  ): Promise<Pick<AuthenticatedActor, "batchScope" | "permissions" | "maintenanceRole" | "studentProfileId">>;

  /** Stamps the moment a login succeeds — V3.0 Administration Platform's "Last Login" column. */
  recordSuccessfulLogin(userId: string, at: Date): Promise<void>;

  /**
   * Sets a new password hash and marks the account as requiring a change on
   * next login — used by both account creation (temp password at creation
   * time) and admin-initiated resets. Never called with `false`; the flag is
   * only ever cleared by ChangeOwnPasswordUseCase, once the account holder
   * proves they know the temporary password.
   */
  setPasswordAndForceChange(userId: string, passwordHash: string): Promise<void>;

  /** Sets a new password hash and clears mustChangePassword — self-service only. */
  setPassword(userId: string, passwordHash: string): Promise<void>;

  /** V3.0 Account Settings: self-service email change. Caller must have already checked uniqueness via findByEmail. */
  updateEmail(userId: string, email: string): Promise<void>;

  /** V3.0 Account Settings: sets or clears (null) the user's avatar FileAsset reference. */
  setAvatarFileId(userId: string, avatarFileId: string | null): Promise<void>;

  /** MYARCH Phase 1 — VerifyEmailUseCase, only for the self-signup case (a User already exists — see EmailVerificationToken's dual shape). Idempotent: verifying twice is a no-op, not an error. */
  markEmailVerified(userId: string): Promise<void>;
}
