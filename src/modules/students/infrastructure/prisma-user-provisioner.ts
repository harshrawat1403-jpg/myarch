import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import type { UserProvisioner } from "../application/ports/user-provisioner";

/**
 * Creates the User row a new StudentProfile requires, with a securely
 * random password that is hashed immediately and never returned or logged
 * in plaintext — see application/ports/user-provisioner.ts for why this
 * account is unusable until a password-reset/invite flow exists.
 */
export class PrismaUserProvisioner implements UserProvisioner {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bcryptCostFactor: number,
  ) {}

  async provisionStudentUser(email: string): Promise<{ userId: string }> {
    const randomPassword = crypto.randomBytes(32).toString("base64url");
    const passwordHash = await bcrypt.hash(randomPassword, this.bcryptCostFactor);

    const user = await this.prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "STUDENT",
      },
      select: { id: true },
    });

    return { userId: user.id };
  }
}
