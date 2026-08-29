import { Prisma, type PrismaClient, type Committee as PrismaCommittee } from "@prisma/client";
import type {
  CommitteeFilters,
  CommitteeRecord,
  CommitteeSort,
  CommitteeStatus,
  PaginatedResult,
  PaginationInput,
} from "../domain/entities";
import type { CommitteeRepository, CreateCommitteeData, UpdateCommitteeData } from "../application/ports/committee-repository";

export class PrismaCommitteeRepository implements CommitteeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCommitteeData): Promise<CommitteeRecord> {
    const row = await this.prisma.committee.create({
      data: {
        name: data.name,
        type: data.type,
        academicYear: data.academicYear ?? null,
        responsibilities: data.responsibilities ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<CommitteeRecord | null> {
    const row = await this.prisma.committee.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateCommitteeData): Promise<CommitteeRecord> {
    const row = await this.prisma.committee.update({
      where: { id },
      data: {
        name: data.name,
        academicYear: data.academicYear,
        responsibilities: data.responsibilities,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: CommitteeStatus): Promise<CommitteeRecord> {
    const row = await this.prisma.committee.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async search(filters: CommitteeFilters, sort: CommitteeSort, pagination: PaginationInput): Promise<PaginatedResult<CommitteeRecord>> {
    const where: Prisma.CommitteeWhereInput = {
      type: filters.type,
      status: filters.status,
      academicYear: filters.academicYear,
      name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      ...(filters.involvingUserId
        ? { memberships: { some: { userId: filters.involvingUserId, isActive: true } } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.committee.findMany({
        where,
        orderBy: { [sort.field]: sort.direction },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.committee.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaCommittee): CommitteeRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    academicYear: row.academicYear,
    responsibilities: row.responsibilities,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
