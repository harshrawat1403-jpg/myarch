import crypto from "node:crypto";
import type { ContentOverrideRecord, DraftSummary, PageContentOverrides, PageDraftOverrides } from "../../../src/modules/content-overrides";
import type { ContentOverrideRepository, SaveDraftContentOverrideInput } from "../../../src/modules/content-overrides/application/ports/content-override-repository";

export class InMemoryContentOverrideRepository implements ContentOverrideRepository {
  private readonly byKey = new Map<string, ContentOverrideRecord>();

  private key(page: string, contentKey: string): string {
    return `${page}::${contentKey}`;
  }

  /** Test seam — seeds a row directly (bypassing the draft/publish flow) for tests that need an already-published field. */
  seedPublished(page: string, contentKey: string, record: Partial<ContentOverrideRecord> & { type: ContentOverrideRecord["type"] }): void {
    const key = this.key(page, contentKey);
    const existing = this.byKey.get(key);
    this.byKey.set(key, {
      id: existing?.id ?? crypto.randomUUID(),
      page,
      contentKey,
      type: record.type,
      textValue: record.textValue ?? null,
      fileId: record.fileId ?? null,
      hasDraftChange: false,
      draftTextValue: null,
      draftFileId: null,
      updatedByUserId: record.updatedByUserId ?? "seed-user",
      updatedAt: new Date(),
      createdAt: existing?.createdAt ?? new Date(),
    });
  }

  async findByPage(page: string): Promise<PageContentOverrides> {
    const result: Record<string, ContentOverrideRecord> = {};
    for (const record of this.byKey.values()) {
      if (record.page === page && (record.textValue !== null || record.fileId !== null)) result[record.contentKey] = record;
    }
    return result;
  }

  async findDraftByPage(page: string): Promise<PageDraftOverrides> {
    const result: Record<string, { type: ContentOverrideRecord["type"]; textValue: string | null; fileId: string | null }> = {};
    for (const record of this.byKey.values()) {
      if (record.page === page && record.hasDraftChange) {
        result[record.contentKey] = { type: record.type, textValue: record.draftTextValue, fileId: record.draftFileId };
      }
    }
    return result;
  }

  async saveDraft(input: SaveDraftContentOverrideInput): Promise<ContentOverrideRecord> {
    const key = this.key(input.page, input.contentKey);
    const existing = this.byKey.get(key);
    const record: ContentOverrideRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      page: input.page,
      contentKey: input.contentKey,
      type: input.type,
      textValue: existing?.textValue ?? null,
      fileId: existing?.fileId ?? null,
      hasDraftChange: true,
      draftTextValue: input.textValue,
      draftFileId: input.fileId,
      updatedByUserId: input.updatedByUserId,
      updatedAt: new Date(),
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.byKey.set(key, record);
    return record;
  }

  async stageReset(page: string, contentKey: string, updatedByUserId: string): Promise<void> {
    const key = this.key(page, contentKey);
    const existing = this.byKey.get(key);
    if (!existing) return;

    if (existing.textValue !== null || existing.fileId !== null) {
      this.byKey.set(key, { ...existing, hasDraftChange: true, draftTextValue: null, draftFileId: null, updatedByUserId, updatedAt: new Date() });
    } else {
      this.byKey.delete(key);
    }
  }

  async publishAllDrafts(): Promise<number> {
    let count = 0;
    for (const [key, record] of this.byKey.entries()) {
      if (!record.hasDraftChange) continue;
      count++;
      if (record.draftTextValue === null && record.draftFileId === null) {
        this.byKey.delete(key);
      } else {
        this.byKey.set(key, {
          ...record,
          textValue: record.draftTextValue,
          fileId: record.draftFileId,
          hasDraftChange: false,
          draftTextValue: null,
          draftFileId: null,
        });
      }
    }
    return count;
  }

  async discardAllDrafts(): Promise<number> {
    let count = 0;
    for (const [key, record] of this.byKey.entries()) {
      if (!record.hasDraftChange) continue;
      count++;
      if (record.textValue === null && record.fileId === null) {
        this.byKey.delete(key);
      } else {
        this.byKey.set(key, { ...record, hasDraftChange: false, draftTextValue: null, draftFileId: null });
      }
    }
    return count;
  }

  async getDraftSummary(): Promise<DraftSummary> {
    const byPage: Record<string, number> = {};
    let total = 0;
    for (const record of this.byKey.values()) {
      if (!record.hasDraftChange) continue;
      byPage[record.page] = (byPage[record.page] ?? 0) + 1;
      total++;
    }
    return { total, byPage };
  }
}
