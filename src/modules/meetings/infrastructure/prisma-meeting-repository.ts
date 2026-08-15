import { Prisma, type PrismaClient, type Meeting as PrismaMeeting } from "@prisma/client";
import type { MeetingFilters, MeetingRecord, MeetingSort, MeetingStatus, PaginatedResult, PaginationInput } from "../domain/entities";
import type { CreateMeetingData, MeetingRepository, UpdateMeetingData } from "../application/ports/meeting-repository";

export class PrismaMeetingRepository implements MeetingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateMeetingData): Promise<MeetingRecord> {
    const row = await this.prisma.meeting.create({
      data: {
        title: data.title,
        agenda: data.agenda ?? null,
        startAt: data.startAt,
        venueOrLink: data.venueOrLink ?? null,
        organizerId: data.organizerId,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<MeetingRecord | null> {
    const row = await this.prisma.meeting.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateMeetingData): Promise<MeetingRecord> {
    const row = await this.prisma.meeting.update({
      where: { id },
      data: {
        title: data.title,
        agenda: data.agenda,
        startAt: data.startAt,
        venueOrLink: data.venueOrLink,
        notes: data.notes,
        decisions: data.decisions,
      },
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: MeetingStatus): Promise<MeetingRecord> {
    const row = await this.prisma.meeting.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async search(filters: MeetingFilters, sort: MeetingSort, pagination: PaginationInput): Promise<PaginatedResult<MeetingRecord>> {
    const where: Prisma.MeetingWhereInput = {
      status: filters.status,
      organizerId: filters.organizerId,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      startAt:
        filters.startAtFrom || filters.startAtTo ? { gte: filters.startAtFrom, lte: filters.startAtTo } : undefined,
      ...(filters.involvingUserId
        ? { OR: [{ organizerId: filters.involvingUserId }, { participants: { some: { userId: filters.involvingUserId } } }] }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        orderBy: { [sort.field]: sort.direction },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaMeeting): MeetingRecord {
  return {
    id: row.id,
    title: row.title,
    agenda: row.agenda,
    startAt: row.startAt,
    venueOrLink: row.venueOrLink,
    status: row.status,
    organizerId: row.organizerId,
    notes: row.notes,
    decisions: row.decisions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
