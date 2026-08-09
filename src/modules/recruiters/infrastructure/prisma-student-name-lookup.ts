import type { PrismaClient } from "@prisma/client";
import type { StudentNameLookup } from "../application/ports/student-name-lookup";

export class PrismaStudentNameLookup implements StudentNameLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findFullNameById(studentProfileId: string): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { fullName: true },
    });
    return student?.fullName ?? null;
  }

  async findUserIdById(studentProfileId: string): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { userId: true },
    });
    return student?.userId ?? null;
  }
}
