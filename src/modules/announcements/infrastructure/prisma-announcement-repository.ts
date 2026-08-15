import { Prisma, type PrismaClient, type Announcement as PrismaAnnouncement } from "@prisma/client";
import type {
  AnnouncementFilters,
  AnnouncementRecord,
  AnnouncementSort,
  PaginatedResult,
  PaginationInput,
} from "../domain/entities";
import type { AnnouncementRepository, CreateAnnouncementData, UpdateAnnouncementData } from "../application/ports/announcement-repository";

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAnnouncementData): Promise<AnnouncementRecord> {
    const row = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority ?? "MEDIUM",
        audienceType: data.audienceType,
        audienceValue: data.audienceValue ?? null,
        publishAt: data.publishAt ?? undefined,
        expiresAt: data.expiresAt ?? null,
        authorId: data.authorId,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<AnnouncementRecord | null> {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateAnnouncementData): Promise<AnnouncementRecord> {
    const row = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority,
        audienceType: data.audienceType,
        audienceValue: data.audienceValue,
        publishAt: data.publishAt,
        expiresAt: data.expiresAt,
      },
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.announcement.delete({ where: { id } });
  }

  async search(filters: AnnouncementFilters, sort: AnnouncementSort, pagination: PaginationInput): Promise<PaginatedResult<AnnouncementRecord>> {
    const now = new Date();
    const where: Prisma.AnnouncementWhereInput = {
      audienceType: filters.audienceType,
      authorId: filters.authorId,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      publishAt:
        filters.publishAtFrom || filters.publishAtTo ? { gte: filters.publishAtFrom, lte: filters.publishAtTo } : undefined,
    };

    const andConditions: Prisma.AnnouncementWhereInput[] = [];
    if (filters.activeOnly) {
      andConditions.push({ publishAt: { lte: now } });
      andConditions.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
    }
    if (filters.audienceScopeFor) {
      const { userId, role, batchId } = filters.audienceScopeFor;
      const scopeOr: Prisma.AnnouncementWhereInput[] = [{ authorId: userId }];
      if (role !== "RECRUITER") scopeOr.push({ audienceType: "EVERYONE" });
      if (role === "COORDINATOR" || role === "SECRETARY") scopeOr.push({ audienceType: "COORDINATORS" });
      if (role === "STUDENT" && batchId) scopeOr.push({ audienceType: "YEAR", audienceValue: batchId });
      scopeOr.push({ audienceType: "SELECTED_GROUP", recipients: { some: { userId } } });
      andConditions.push({ OR: scopeOr });
    }
    if (andConditions.length > 0) where.AND = andConditions;

    const [rows, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { [sort.field]: sort.direction },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaAnnouncement): AnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: row.priority,
    audienceType: row.audienceType,
    audienceValue: row.audienceValue,
    publishAt: row.publishAt,
    expiresAt: row.expiresAt,
    authorId: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
