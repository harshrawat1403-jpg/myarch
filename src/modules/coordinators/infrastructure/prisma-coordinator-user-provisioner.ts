import bcrypt from "bcryptjs";
import type { PrismaTransactionClient } from "@/lib/prisma";
import { generateTempPassword } from "@/modules/auth/domain/temp-password";
import type { CoordinatorUserProvisioner } from "../application/ports/coordinator-user-provisioner";

/**
 * generateTempPassword's home module is auth/domain — a framework-free pure
 * function, safe to import directly (not a Clean-Architecture-boundary
 * violation the way reaching into auth/infrastructure would be; the
 * students module's own PrismaUserProvisioner takes the equivalent
 * shortcut by hand-rolling crypto.randomBytes rather than depending on
 * auth's PasswordHasher port for a one-off hash).
 */
export class PrismaCoordinatorUserProvisioner implements CoordinatorUserProvisioner {
  constructor(
    private readonly prisma: PrismaTransactionClient,
    private readonly bcryptCostFactor: number,
  ) {}

  async provisionCoordinatorUser(email: string): Promise<{ userId: string; tempPassword: string }> {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, this.bcryptCostFactor);

    const user = await this.prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "COORDINATOR",
        mustChangePassword: true,
      },
      select: { id: true },
    });

    return { userId: user.id, tempPassword };
  }
}
