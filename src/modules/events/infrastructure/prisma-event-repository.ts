import { Prisma, type PrismaClient, type Event as PrismaEvent } from "@prisma/client";
import type { EventFilters, EventRecord, EventSort, EventStatus, PaginatedResult, PaginationInput } from "../domain/entities";
import type { CreateEventData, EventRepository, UpdateEventData } from "../application/ports/event-repository";
import { slugifyEventTitle } from "../domain/explore";

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEventData): Promise<EventRecord> {
    let row: PrismaEvent | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = await this.nextSlug(data.title);
      try {
        row = await this.prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description ?? null,
        shortDescription: data.shortDescription ?? null,
        category: data.category ?? null,
        isPublic: data.isPublic ?? false,
        featured: data.featured ?? false,
        startAt: data.startAt,
        endAt: data.endAt ?? null,
        venue: data.venue ?? null,
        organizerId: data.organizerId,
        budgetAmount: data.budgetAmount ?? null,
        budgetNotes: data.budgetNotes ?? null,
      },
        });
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 4) throw error;
      }
    }
    if (!row) throw new Error("Unable to create event");
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
        shortDescription: data.shortDescription,
        category: data.category,
        isPublic: data.isPublic,
        featured: data.featured,
        coverImageFileId: data.coverImageFileId,
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

  private async nextSlug(title: string): Promise<string> {
    const base = slugifyEventTitle(title);
    for (let suffix = 1; suffix < 1000; suffix += 1) {
      const slug = suffix === 1 ? base : `${base}-${suffix}`;
      const existing = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
      if (!existing) return slug;
    }
    throw new Error("Unable to allocate a unique event slug");
  }
}

function toDomain(row: PrismaEvent): EventRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    category: row.category,
    isPublic: row.isPublic,
    featured: row.featured,
    coverImageFileId: row.coverImageFileId,
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
