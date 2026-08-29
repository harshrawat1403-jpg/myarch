import type { PrismaClient, CommitteeMembership as PrismaCommitteeMembership } from "@prisma/client";
import type { CommitteeMembershipRecord } from "../domain/entities";
import type {
  AddCommitteeMembershipData,
  CommitteeMembershipRepository,
  UpdateCommitteeMembershipData,
} from "../application/ports/committee-membership-repository";

export class PrismaCommitteeMembershipRepository implements CommitteeMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(data: AddCommitteeMembershipData): Promise<CommitteeMembershipRecord> {
    const row = await this.prisma.committeeMembership.create({
      data: {
        committeeId: data.committeeId,
        userId: data.userId,
        position: data.position ?? null,
        isLead: data.isLead ?? false,
        academicYear: data.academicYear ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<CommitteeMembershipRecord | null> {
    const row = await this.prisma.committeeMembership.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findActiveByCommitteeAndUser(committeeId: string, userId: string): Promise<CommitteeMembershipRecord | null> {
    const row = await this.prisma.committeeMembership.findFirst({
      where: { committeeId, userId, isActive: true },
    });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateCommitteeMembershipData): Promise<CommitteeMembershipRecord> {
    const row = await this.prisma.committeeMembership.update({
      where: { id },
      data: { position: data.position, isLead: data.isLead },
    });
    return toDomain(row);
  }

  async end(id: string): Promise<CommitteeMembershipRecord> {
    const row = await this.prisma.committeeMembership.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    });
    return toDomain(row);
  }

  async listForCommittee(committeeId: string): Promise<CommitteeMembershipRecord[]> {
    const rows = await this.prisma.committeeMembership.findMany({
      where: { committeeId },
      orderBy: { startDate: "asc" },
    });
    return rows.map(toDomain);
  }

  async listActiveForUser(userId: string): Promise<CommitteeMembershipRecord[]> {
    const rows = await this.prisma.committeeMembership.findMany({
      where: { userId, isActive: true },
      orderBy: { startDate: "asc" },
    });
    return rows.map(toDomain);
  }
}

function toDomain(row: PrismaCommitteeMembership): CommitteeMembershipRecord {
  return {
    id: row.id,
    committeeId: row.committeeId,
    userId: row.userId,
    position: row.position,
    isLead: row.isLead,
    academicYear: row.academicYear,
    isActive: row.isActive,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
  };
}
