import type { ContentOverrideRecord, ContentOverrideType, DraftSummary, PageContentOverrides, PageDraftOverrides } from "../../domain/entities";

export interface SaveDraftContentOverrideInput {
  readonly page: string;
  readonly contentKey: string;
  readonly type: ContentOverrideType;
  readonly textValue: string | null;
  readonly fileId: string | null;
  readonly updatedByUserId: string;
}

export interface ContentOverrideRepository {
  /** Published values only — the one read path every page's normal server render uses. Drafts never appear here. */
  findByPage(page: string): Promise<PageContentOverrides>;
  /** Pending drafts only, for one page — SECRETARY-only preview read. */
  findDraftByPage(page: string): Promise<PageDraftOverrides>;
  /** Upserts the DRAFT columns (`hasDraftChange=true`) — published columns are never touched by this. */
  saveDraft(input: SaveDraftContentOverrideInput): Promise<ContentOverrideRecord>;
  /**
   * Stages a Reset for one field: if the row has a published value, marks
   * it `hasDraftChange=true` with both draft columns cleared (pending
   * removal, applied on Publish); if it has no published value (a pure
   * draft that never went live), deletes the row outright — nothing
   * meaningful to stage.
   */
  stageReset(page: string, contentKey: string, updatedByUserId: string): Promise<void>;
  /** Applies every pending draft across every page: copies draft→published, or deletes the row for a staged reset. Returns the number of rows affected. */
  publishAllDrafts(): Promise<number>;
  /** Abandons every pending draft across every page: clears draft columns where a published value exists, deletes rows that never had one. Returns the number of rows affected. */
  discardAllDrafts(): Promise<number>;
  getDraftSummary(): Promise<DraftSummary>;
}
