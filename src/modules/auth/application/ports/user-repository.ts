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
  ): Promise<Pick<AuthenticatedActor, "batchScope" | "studentProfileId">>;
}
