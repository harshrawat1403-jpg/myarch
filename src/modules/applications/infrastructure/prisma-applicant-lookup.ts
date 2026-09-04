import type { PrismaClient } from "@prisma/client";
import type { ApplicantLookup, StudentApplicant } from "../application/ports/applicant-lookup";

export class PrismaApplicantLookup implements ApplicantLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<StudentApplicant | null> {
    const row = await this.prisma.studentProfile.findFirst({
      where: { userId, isActive: true, user: { isActive: true, role: "STUDENT" } },
      select: { id: true, userId: true, batchId: true, fullName: true },
    });
    return row ? { studentProfileId: row.id, userId: row.userId, batchId: row.batchId, fullName: row.fullName } : null;
  }
}
