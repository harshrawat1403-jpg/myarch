import type { Prisma, RegistrationRequest as PrismaRegistrationRequest } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma";
import type {
  RegistrationRequestRecord,
  RegistrationRequestSearchFilters,
} from "../domain/entities";
import type {
  CreateRegistrationRequestData,
  DecideRegistrationRequestData,
  MarkRegistrationRequestData,
  RegistrationRequestRepository,
} from "../application/ports/registration-request-repository";

const PENDING_STATUSES: Prisma.RegistrationRequestWhereInput["status"] = {
  in: ["SUBMITTED", "REVIEWED", "NEEDS_ATTENTION"],
};

export class PrismaRegistrationRequestRepository implements RegistrationRequestRepository {
  constructor(private readonly prisma: PrismaTransactionClient) {}

  async create(data: CreateRegistrationRequestData): Promise<RegistrationRequestRecord> {
    const row = await this.prisma.registrationRequest.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        rollNumber: data.rollNumber,
        batchId: data.batchId,
        submittedData: data.submittedData as Prisma.InputJsonValue,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<RegistrationRequestRecord | null> {
    const row = await this.prisma.registrationRequest.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async hasPendingByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.registrationRequest.count({
      where: { email: { equals: email, mode: "insensitive" }, status: PENDING_STATUSES },
    });
    return count > 0;
  }

  async hasPendingByRollNumber(rollNumber: string): Promise<boolean> {
    const count = await this.prisma.registrationRequest.count({
      where: { rollNumber: { equals: rollNumber, mode: "insensitive" }, status: PENDING_STATUSES },
    });
    return count > 0;
  }

  async search(filters: RegistrationRequestSearchFilters): Promise<RegistrationRequestRecord[]> {
    // batchIds (actor-derived Coordinator scope allow-list, server-controlled)
    // and batchId (a single caller-supplied filter) are combined with real
    // AND semantics — a caller-supplied batchId outside the actor's scope
    // must match nothing, never silently bypass the scope allow-list.
    const clauses: Prisma.RegistrationRequestWhereInput[] = [{ status: filters.status }];
    if (filters.batchId) clauses.push({ batchId: filters.batchId });
    if (filters.batchIds) clauses.push({ batchId: { in: [...filters.batchIds] } });

    const rows = await this.prisma.registrationRequest.findMany({
      where: { AND: clauses },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDomain);
  }

  async mark(id: string, data: MarkRegistrationRequestData): Promise<RegistrationRequestRecord> {
    const row = await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: data.status,
        coordinatorComment: data.coordinatorComment,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: new Date(),
      },
    });
    return toDomain(row);
  }

  async decide(
    id: string,
    data: DecideRegistrationRequestData,
  ): Promise<RegistrationRequestRecord> {
    const row = await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: data.status,
        decidedByUserId: data.decidedByUserId,
        decidedAt: new Date(),
        rejectionReason: data.rejectionReason,
        resultingStudentProfileId: data.resultingStudentProfileId,
      },
    });
    return toDomain(row);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.prisma.registrationRequest.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
    });
  }
}

function toDomain(row: PrismaRegistrationRequest): RegistrationRequestRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    rollNumber: row.rollNumber,
    batchId: row.batchId,
    submittedData: row.submittedData as RegistrationRequestRecord["submittedData"],
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    coordinatorComment: row.coordinatorComment,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    rejectionReason: row.rejectionReason,
    resultingStudentProfileId: row.resultingStudentProfileId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
