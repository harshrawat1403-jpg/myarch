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
    if (role === "STUDENT") {
      // V4.0 A3: Students get the same self-service Account Settings page —
      // StudentProfile.fullName is the same "duplicated intentionally for
      // non-sensitive identification" field the rest of the app already
      // reads for display (docs/database/08_Database_Design.md).
      await this.prisma.studentProfile.update({ where: { userId }, data: { fullName } });
      return;
    }
    // Recruiter self-service settings aren't part of this path yet — no
    // route reaches here for that role today.
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
    if (role === "STUDENT") {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
      return profile?.fullName ?? null;
    }
    return null;
  }
}
