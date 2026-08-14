import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { generateTempPassword } from "@/modules/auth/domain/temp-password";
import type { RecruiterUserProvisioner } from "../application/ports/recruiter-user-provisioner";

/** Mirrors coordinators/infrastructure/prisma-coordinator-user-provisioner.ts's reasoning exactly. */
export class PrismaRecruiterUserProvisioner implements RecruiterUserProvisioner {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bcryptCostFactor: number,
  ) {}

  async provisionRecruiterUser(email: string): Promise<{ userId: string; tempPassword: string }> {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, this.bcryptCostFactor);

    const user = await this.prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "RECRUITER",
        mustChangePassword: true,
      },
      select: { id: true },
    });

    return { userId: user.id, tempPassword };
  }

  async provisionSelfSignupRecruiterUser(email: string, passwordHash: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "RECRUITER",
        // Blocks login (LoginUseCase's isActive check) until
        // ApproveRecruiterUseCase flips this — see that port method's own
        // doc comment.
        isActive: false,
        mustChangePassword: false,
      },
      select: { id: true },
    });

    return { userId: user.id };
  }
}
