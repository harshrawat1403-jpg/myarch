import type { Prisma, PrismaClient } from "@prisma/client";
import type { ContentOverrideRecord, DraftOverrideValue, DraftSummary, PageContentOverrides, PageDraftOverrides } from "../domain/entities";
import type { ContentOverrideRepository, SaveDraftContentOverrideInput } from "../application/ports/content-override-repository";

type ContentOverrideRow = Awaited<ReturnType<PrismaClient["contentOverride"]["upsert"]>>;

function toDomain(row: ContentOverrideRow): ContentOverrideRecord {
  return {
    id: row.id,
    page: row.page,
    contentKey: row.contentKey,
    type: row.type,
    textValue: row.textValue,
    fileId: row.fileId,
    hasDraftChange: row.hasDraftChange,
    draftTextValue: row.draftTextValue,
    draftFileId: row.draftFileId,
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

export class PrismaContentOverrideRepository implements ContentOverrideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPage(page: string): Promise<PageContentOverrides> {
    const rows = await this.prisma.contentOverride.findMany({ where: { page } });
    const result: Record<string, ContentOverrideRecord> = {};
    for (const row of rows) {
      // A row that only ever holds a pending draft (never published) has
      // no published value to surface here — the normal page render must
      // not see it at all, matching "drafts never leak into public/normal
      // view" by construction, not a runtime filter.
      if (row.textValue !== null || row.fileId !== null) result[row.contentKey] = toDomain(row);
    }
    return result;
  }

  async findDraftByPage(page: string): Promise<PageDraftOverrides> {
    const rows = await this.prisma.contentOverride.findMany({ where: { page, hasDraftChange: true } });
    const result: Record<string, DraftOverrideValue> = {};
    for (const row of rows) {
      result[row.contentKey] = { type: row.type, textValue: row.draftTextValue, fileId: row.draftFileId };
    }
    return result;
  }

  async saveDraft(input: SaveDraftContentOverrideInput): Promise<ContentOverrideRecord> {
    const row = await this.prisma.contentOverride.upsert({
      where: { page_contentKey: { page: input.page, contentKey: input.contentKey } },
      create: {
        page: input.page,
        contentKey: input.contentKey,
        type: input.type,
        hasDraftChange: true,
        draftTextValue: input.textValue,
        draftFileId: input.fileId,
        updatedByUserId: input.updatedByUserId,
      },
      update: {
        type: input.type,
        hasDraftChange: true,
        draftTextValue: input.textValue,
        draftFileId: input.fileId,
        updatedByUserId: input.updatedByUserId,
      } satisfies Prisma.ContentOverrideUncheckedUpdateInput,
    });
    return toDomain(row);
  }

  async stageReset(page: string, contentKey: string, updatedByUserId: string): Promise<void> {
    const existing = await this.prisma.contentOverride.findUnique({ where: { page_contentKey: { page, contentKey } } });
    if (!existing) return;

    if (existing.textValue !== null || existing.fileId !== null) {
      await this.prisma.contentOverride.update({
        where: { page_contentKey: { page, contentKey } },
        data: { hasDraftChange: true, draftTextValue: null, draftFileId: null, updatedByUserId },
      });
    } else {
      await this.prisma.contentOverride.delete({ where: { page_contentKey: { page, contentKey } } });
    }
  }

  async publishAllDrafts(): Promise<number> {
    const pending = await this.prisma.contentOverride.findMany({ where: { hasDraftChange: true } });
    if (pending.length === 0) return 0;

    await this.prisma.$transaction(
      pending.map((row) =>
        row.draftTextValue === null && row.draftFileId === null
          ? this.prisma.contentOverride.delete({ where: { id: row.id } })
          : this.prisma.contentOverride.update({
              where: { id: row.id },
              data: {
                textValue: row.draftTextValue,
                fileId: row.draftFileId,
                hasDraftChange: false,
                draftTextValue: null,
                draftFileId: null,
              },
            }),
      ),
    );
    return pending.length;
  }

  async discardAllDrafts(): Promise<number> {
    const pending = await this.prisma.contentOverride.findMany({ where: { hasDraftChange: true } });
    if (pending.length === 0) return 0;

    await this.prisma.$transaction(
      pending.map((row) =>
        row.textValue === null && row.fileId === null
          ? this.prisma.contentOverride.delete({ where: { id: row.id } })
          : this.prisma.contentOverride.update({
              where: { id: row.id },
              data: { hasDraftChange: false, draftTextValue: null, draftFileId: null },
            }),
      ),
    );
    return pending.length;
  }

  async getDraftSummary(): Promise<DraftSummary> {
    const grouped = await this.prisma.contentOverride.groupBy({
      by: ["page"],
      where: { hasDraftChange: true },
      _count: { _all: true },
    });
    const byPage: Record<string, number> = {};
    let total = 0;
    for (const group of grouped) {
      byPage[group.page] = group._count._all;
      total += group._count._all;
    }
    return { total, byPage };
  }
}
