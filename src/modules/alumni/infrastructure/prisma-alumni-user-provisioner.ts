import type { PrismaClient } from "@prisma/client";
import type { AlumniUserProvisioner } from "../application/ports/alumni-user-provisioner";

/** Mirrors recruiters/infrastructure/prisma-recruiter-user-provisioner.ts's provisionSelfSignupRecruiterUser exactly. */
export class PrismaAlumniUserProvisioner implements AlumniUserProvisioner {
  constructor(private readonly prisma: PrismaClient) {}

  async provisionSelfSignupAlumniUser(email: string, passwordHash: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "ALUMNI",
        // Blocks login (LoginUseCase's isActive check) until
        // ApproveAlumniUseCase flips this — see that port method's own doc
        // comment.
        isActive: false,
        mustChangePassword: false,
      },
      select: { id: true },
    });

    return { userId: user.id };
  }
}
