import type { Role } from "@/modules/auth";

/** AssignRequestUseCase — confirms the prospective owner is Secretary/Coordinator. Re-declared per this module's own isolation convention. */
export interface UserRoleLookup {
  findRoleByUserId(userId: string): Promise<Role | null>;
}
