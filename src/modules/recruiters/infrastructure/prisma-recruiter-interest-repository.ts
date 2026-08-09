import type { PrismaClient, RecruiterInterestRequest } from "@prisma/client";
import type { RecruiterInterestRequestRecord, StudentInterestDTO } from "../domain/entities";
import type { RecruiterInterestRepository } from "../application/ports/recruiter-interest-repository";

export class PrismaRecruiterInterestRepository implements RecruiterInterestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    recruiterProfileId: string,
    studentProfileId: string,
    message: string | null,
  ): Promise<RecruiterInterestRequestRecord> {
    const row = await this.prisma.recruiterInterestRequest.create({
      data: { recruiterProfileId, studentProfileId, message },
    });
    return toDomain(row);
  }

  async findByRecruiterAndStudent(
    recruiterProfileId: string,
    studentProfileId: string,
  ): Promise<RecruiterInterestRequestRecord | null> {
    const row = await this.prisma.recruiterInterestRequest.findUnique({
      where: { recruiterProfileId_studentProfileId: { recruiterProfileId, studentProfileId } },
    });
    return row ? toDomain(row) : null;
  }

  async findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInterestRequestRecord[]> {
    if (studentProfileIds.length === 0) return [];
    const rows = await this.prisma.recruiterInterestRequest.findMany({
      where: { recruiterProfileId, studentProfileId: { in: [...studentProfileIds] } },
    });
    return rows.map(toDomain);
  }

  async listForRecruiter(recruiterProfileId: string): Promise<RecruiterInterestRequestRecord[]> {
    const rows = await this.prisma.recruiterInterestRequest.findMany({
      where: { recruiterProfileId },
      orderBy: { sentAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<RecruiterInterestRequestRecord | null> {
    const row = await this.prisma.recruiterInterestRequest.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async listForStudent(studentProfileId: string): Promise<StudentInterestDTO[]> {
    const rows = await this.prisma.recruiterInterestRequest.findMany({
      where: { studentProfileId },
      orderBy: { sentAt: "desc" },
      include: { recruiterProfile: { select: { companyName: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      companyName: row.recruiterProfile.companyName,
      message: row.message,
      status: row.status,
      sentAt: row.sentAt,
      respondedAt: row.respondedAt,
    }));
  }

  async respond(id: string, status: "ACCEPTED" | "DECLINED", respondedAt: Date): Promise<RecruiterInterestRequestRecord> {
    const row = await this.prisma.recruiterInterestRequest.update({
      where: { id },
      data: { status, respondedAt },
    });
    return toDomain(row);
  }
}

function toDomain(row: RecruiterInterestRequest): RecruiterInterestRequestRecord {
  return {
    id: row.id,
    recruiterProfileId: row.recruiterProfileId,
    studentProfileId: row.studentProfileId,
    message: row.message,
    status: row.status,
    sentAt: row.sentAt,
    respondedAt: row.respondedAt,
    completedAt: row.completedAt,
  };
}
