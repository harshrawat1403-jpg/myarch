import { Prisma, type PrismaClient, type Event as PrismaEvent } from "@prisma/client";
import type { EventFilters, EventRecord, EventSort, EventStatus, PaginatedResult, PaginationInput } from "../domain/entities";
import type { CreateEventData, EventRepository, UpdateEventData } from "../application/ports/event-repository";

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEventData): Promise<EventRecord> {
    const row = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        startAt: data.startAt,
        endAt: data.endAt ?? null,
        venue: data.venue ?? null,
        organizerId: data.organizerId,
        budgetAmount: data.budgetAmount ?? null,
        budgetNotes: data.budgetNotes ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<EventRecord | null> {
    const row = await this.prisma.event.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateEventData): Promise<EventRecord> {
    const row = await this.prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        venue: data.venue,
        budgetAmount: data.budgetAmount,
        budgetNotes: data.budgetNotes,
        postEventReport: data.postEventReport,
      },
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: EventStatus): Promise<EventRecord> {
    const row = await this.prisma.event.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async search(filters: EventFilters, sort: EventSort, pagination: PaginationInput): Promise<PaginatedResult<EventRecord>> {
    const where: Prisma.EventWhereInput = {
      status: filters.status,
      organizerId: filters.organizerId,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      startAt:
        filters.startAtFrom || filters.startAtTo
          ? { gte: filters.startAtFrom, lte: filters.startAtTo }
          : undefined,
      ...(filters.ownOrPublishedOnly
        ? { OR: [{ organizerId: filters.ownOrPublishedOnly }, { status: { not: "DRAFT" } }] }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { [sort.field]: sort.direction },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaEvent): EventRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.startAt,
    endAt: row.endAt,
    venue: row.venue,
    status: row.status,
    organizerId: row.organizerId,
    budgetAmount: row.budgetAmount ? row.budgetAmount.toString() : null,
    budgetNotes: row.budgetNotes,
    postEventReport: row.postEventReport,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
