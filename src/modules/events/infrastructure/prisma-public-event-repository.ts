import { Prisma, type PrismaClient } from "@prisma/client";
import { derivePublicEventStatus, type PublicEventStatus } from "../domain/explore";

export interface PublicEventListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  startAt: Date;
  endAt: Date | null;
  venue: string | null;
  organizer: string;
  status: PublicEventStatus;
  featured: boolean;
  hasRegistration: boolean;
  coverImageUrl: string | null;
}

export interface PublicEventDetail extends PublicEventListItem {
  description: string | null;
  gallery: { id: string; caption: string | null; displayOrder: number; imageUrl: string }[];
  forms: { id: string; title: string; description: string | null; kind: "REGISTRATION" | "VOLUNTEER" | "OTHER"; deadline: Date | null }[];
  announcements: { id: string; title: string; content: string; publishAt: Date }[];
}

const publicWhere: Prisma.EventWhereInput = { isPublic: true, status: { in: ["PUBLISHED", "COMPLETED"] } };

export class PrismaPublicEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: { search?: string; status?: PublicEventStatus; category?: string; page: number; pageSize: number }) {
    const now = new Date();
    const statusFilter: Prisma.EventWhereInput = input.status === "UPCOMING"
      ? { startAt: { gt: now } }
      : input.status === "ONGOING"
        ? { startAt: { lte: now }, OR: [{ endAt: { gte: now } }, { endAt: null, startAt: { gte: now } }] }
        : input.status === "COMPLETED"
          ? { OR: [{ endAt: { lt: now } }, { endAt: null, startAt: { lt: now } }] }
          : {};
    const where: Prisma.EventWhereInput = {
      ...publicWhere,
      ...statusFilter,
      category: input.category || undefined,
      title: input.search ? { contains: input.search, mode: "insensitive" } : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ featured: "desc" }, { startAt: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: { organizer: { select: { email: true } }, coverImage: { select: { id: true } }, formLinks: { select: { id: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);
    return { items: rows.map((row) => toListItem(row, now)), total, page: input.page, pageSize: input.pageSize };
  }

  async findBySlug(slug: string): Promise<PublicEventDetail | null> {
    const now = new Date();
    const row = await this.prisma.event.findFirst({
      where: { ...publicWhere, slug },
      include: {
        organizer: { select: { email: true } },
        coverImage: { select: { id: true } },
        formLinks: { include: { form: { select: { id: true, title: true, description: true, deadline: true, status: true } } } },
        announcementLinks: { include: { announcement: { select: { id: true, title: true, content: true, publishAt: true, expiresAt: true, audienceType: true } } } },
        gallery: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], include: { file: { select: { id: true } } } },
      },
    });
    if (!row) return null;
    const base = toListItem(row, now);
    return {
      ...base,
      description: row.description,
      gallery: row.gallery.map((item) => ({ id: item.id, caption: item.caption, displayOrder: item.displayOrder, imageUrl: `/api/public/events/media/${item.file.id}` })),
      forms: row.formLinks.filter((link) => link.form.status === "PUBLISHED").map((link) => ({ id: link.form.id, title: link.form.title, description: link.form.description, deadline: link.form.deadline, kind: link.kind })),
      announcements: row.announcementLinks
        .map((link) => link.announcement)
        .filter((announcement) => announcement.audienceType === "EVERYONE" && announcement.publishAt <= now && (!announcement.expiresAt || announcement.expiresAt > now))
        .map((announcement) => ({ id: announcement.id, title: announcement.title, content: announcement.content, publishAt: announcement.publishAt })),
    };
  }

  async findPublicMedia(fileId: string) {
    return this.prisma.fileAsset.findFirst({
      where: { id: fileId, OR: [
        { usedAsEventCoverImageOf: { some: publicWhere } },
        { usedAsEventGalleryImageOf: { some: { event: publicWhere } } },
      ] },
      select: { storageKey: true, mimeType: true },
    });
  }
}

function toListItem(row: { id: string; slug: string; title: string; shortDescription: string | null; category: string | null; startAt: Date; endAt: Date | null; venue: string | null; featured: boolean; organizer: { email: string }; coverImage: { id: string } | null; formLinks: unknown[] }, now: Date): PublicEventListItem {
  return { id: row.id, slug: row.slug, title: row.title, shortDescription: row.shortDescription, category: row.category, startAt: row.startAt, endAt: row.endAt, venue: row.venue, organizer: row.organizer.email, status: derivePublicEventStatus(row.startAt, row.endAt, now), featured: row.featured, hasRegistration: row.formLinks.length > 0, coverImageUrl: row.coverImage ? `/api/public/events/media/${row.coverImage.id}` : null };
}
