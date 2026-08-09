import type { InternshipOutcome as PrismaInternshipOutcome, PrismaClient } from "@prisma/client";
import type { InternshipOutcomeRecord } from "../domain/entities";
import type { InternshipOutcomeRepository } from "../application/ports/internship-outcome-repository";

export class PrismaInternshipOutcomeRepository implements InternshipOutcomeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(applicationId: string): Promise<InternshipOutcomeRecord> {
    const row = await this.prisma.internshipOutcome.create({ data: { applicationId } });
    return toDomain(row);
  }

  async findByApplicationId(applicationId: string): Promise<InternshipOutcomeRecord | null> {
    const row = await this.prisma.internshipOutcome.findUnique({ where: { applicationId } });
    return row ? toDomain(row) : null;
  }

  async setCompanyFeedback(applicationId: string, companyFeedback: string): Promise<InternshipOutcomeRecord> {
    const row = await this.prisma.internshipOutcome.update({ where: { applicationId }, data: { companyFeedback } });
    return toDomain(row);
  }

  async setStudentFeedback(applicationId: string, studentFeedback: string): Promise<InternshipOutcomeRecord> {
    const row = await this.prisma.internshipOutcome.update({ where: { applicationId }, data: { studentFeedback } });
    return toDomain(row);
  }

  async setCertificateFileId(applicationId: string, certificateFileId: string | null): Promise<InternshipOutcomeRecord> {
    const row = await this.prisma.internshipOutcome.update({ where: { applicationId }, data: { certificateFileId } });
    return toDomain(row);
  }

  async setCompletedAt(applicationId: string, completedAt: Date): Promise<InternshipOutcomeRecord> {
    const row = await this.prisma.internshipOutcome.update({ where: { applicationId }, data: { completedAt } });
    return toDomain(row);
  }
}

function toDomain(row: PrismaInternshipOutcome): InternshipOutcomeRecord {
  return {
    id: row.id,
    applicationId: row.applicationId,
    certificateFileId: row.certificateFileId,
    companyFeedback: row.companyFeedback,
    studentFeedback: row.studentFeedback,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
