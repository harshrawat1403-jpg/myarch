import type { PrismaClient } from "@prisma/client";
import type { Role } from "../domain/entities";
import type { ProfileNameRepository } from "../application/ports/profile-name-repository";

export class PrismaProfileNameRepository implements ProfileNameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async updateFullName(userId: string, role: Role, fullName: string): Promise<void> {
    if (role === "SECRETARY") {
      await this.prisma.secretaryProfile.update({ where: { userId }, data: { fullName } });
      return;
    }
    if (role === "COORDINATOR") {
      await this.prisma.coordinatorProfile.update({ where: { userId }, data: { fullName } });
      return;
    }
    // Account Settings (M3) only serves Secretary/Coordinator today (it's
    // reached only from the (admin) shell) — Student/Recruiter display
    // names aren't editable through this path.
    throw new Error(`No editable display name for role ${role}`);
  }

  async getFullName(userId: string, role: Role): Promise<string | null> {
    if (role === "SECRETARY") {
      const profile = await this.prisma.secretaryProfile.findUnique({ where: { userId } });
      return profile?.fullName ?? null;
    }
    if (role === "COORDINATOR") {
      const profile = await this.prisma.coordinatorProfile.findUnique({ where: { userId } });
      return profile?.fullName ?? null;
    }
    return null;
  }
}
