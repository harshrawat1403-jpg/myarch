import type { PrismaClient } from "@prisma/client";
import type { StudentEligibilityData, StudentEligibilityLookup } from "../application/ports/student-eligibility-lookup";

export class PrismaStudentEligibilityLookup implements StudentEligibilityLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentProfileId(studentProfileId: string): Promise<StudentEligibilityData | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: {
        userId: true,
        batchId: true,
        fullName: true,
        batch: { select: { name: true } },
        privateProfile: { select: { cgpa: true, hasActiveBacklog: true } },
      },
    });
    if (!student) return null;

    return {
      userId: student.userId,
      batchId: student.batchId,
      batchName: student.batch.name,
      fullName: student.fullName,
      cgpa: student.privateProfile?.cgpa ? Number(student.privateProfile.cgpa) : null,
      hasActiveBacklog: student.privateProfile?.hasActiveBacklog ?? false,
    };
  }

  async listUserIdsForBatches(batchIds: readonly string[]): Promise<string[]> {
    const students = await this.prisma.studentProfile.findMany({
      where: { isActive: true, ...(batchIds.length > 0 ? { batchId: { in: [...batchIds] } } : {}) },
      select: { userId: true },
    });
    return students.map((s) => s.userId);
  }
}
