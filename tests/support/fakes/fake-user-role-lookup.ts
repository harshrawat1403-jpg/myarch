import type { Role } from "../../../src/modules/auth";
import type { UserRoleLookup } from "../../../src/modules/tasks/application/ports/user-role-lookup";

export class FakeUserRoleLookup implements UserRoleLookup {
  private readonly roles = new Map<string, Role>();

  seed(userId: string, role: Role): void {
    this.roles.set(userId, role);
  }

  async findRoleByUserId(userId: string): Promise<Role | null> {
    return this.roles.get(userId) ?? null;
  }
}
