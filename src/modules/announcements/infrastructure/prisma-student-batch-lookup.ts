import type { PrismaClient } from "@prisma/client";
import type { StudentBatchLookup } from "../application/ports/student-batch-lookup";

export class PrismaStudentBatchLookup implements StudentBatchLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findBatchIdByUserId(userId: string): Promise<string | null> {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId }, select: { batchId: true } });
    return profile?.batchId ?? null;
  }
}
