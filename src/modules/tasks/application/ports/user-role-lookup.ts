import type { Role } from "@/modules/auth";

/** CreateTaskUseCase/ReassignTaskUseCase — resolves the prospective owner's role so canAssignTaskTo can enforce "Coordinator cannot assign to Secretary or another Coordinator." Narrow and read-only, same shape as recruiters/secretary-recipient-lookup.ts. */
export interface UserRoleLookup {
  findRoleByUserId(userId: string): Promise<Role | null>;
}
