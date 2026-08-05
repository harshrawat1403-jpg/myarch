import type { PrismaClient } from "@prisma/client";
import type { StudentLookup } from "../application/ports/student-lookup";

export class PrismaStudentLookup implements StudentLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<{ id: string; batchId: string; userId: string; fullName: string } | null> {
    return this.prisma.studentProfile.findUnique({
      where: { id },
      select: { id: true, batchId: true, userId: true, fullName: true },
    });
  }
}
