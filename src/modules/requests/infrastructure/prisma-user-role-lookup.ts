import type { PrismaClient } from "@prisma/client";
import type { Role } from "@/modules/auth";
import type { UserRoleLookup } from "../application/ports/user-role-lookup";

export class PrismaUserRoleLookup implements UserRoleLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findRoleByUserId(userId: string): Promise<Role | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return (user?.role as Role | undefined) ?? null;
  }
}
