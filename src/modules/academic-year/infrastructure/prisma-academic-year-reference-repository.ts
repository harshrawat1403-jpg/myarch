import type { PrismaClient } from "@prisma/client";
import type {
  AcademicYearReferenceRepository,
  BatchReference,
  CoordinatorReference,
} from "../application/ports/academic-year-reference-repository";

export class PrismaAcademicYearReferenceRepository implements AcademicYearReferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBatchById(id: string): Promise<BatchReference | null> {
    return this.prisma.batch.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });
  }

  async findCoordinatorById(id: string): Promise<CoordinatorReference | null> {
    const row = await this.prisma.coordinatorProfile.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });
    return row;
  }
}
