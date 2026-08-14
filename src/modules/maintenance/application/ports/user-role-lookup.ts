import type { Role } from "@/modules/auth";

/** AssignMaintenanceIssueUseCase — confirms the prospective assignee is Secretary/Coordinator. Re-declared per this module's own isolation convention (mirrors tasks/application/ports/user-role-lookup.ts). */
export interface UserRoleLookup {
  findRoleByUserId(userId: string): Promise<Role | null>;
}
