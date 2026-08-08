import type { Role } from "../../domain/entities";

/**
 * Display name lives on the role-specific profile table (SecretaryProfile.
 * fullName, CoordinatorProfile.fullName — the only two roles Account
 * Settings serves, see update-own-profile.ts), not on User itself. This
 * small port isolates that role-dispatch so the use case doesn't need to
 * know which Prisma table a given role's name lives in.
 */
export interface ProfileNameRepository {
  updateFullName(userId: string, role: Role, fullName: string): Promise<void>;
  /** Null for a role with no editable-name profile through this path (see updateFullName's doc comment) or a not-yet-provisioned profile row. */
  getFullName(userId: string, role: Role): Promise<string | null>;
}
