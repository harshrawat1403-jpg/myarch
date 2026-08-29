/**
 * MYARCH Edit Mode — corrected architecture. A `ContentOverride` is a single
 * piece of developer-authored text or an image on an EXISTING public page
 * that a Secretary has replaced. `page` + `contentKey` together identify
 * one field (e.g. page "about", contentKey "hero.title") — when no row
 * exists for a given `(page, contentKey)`, the page's own hardcoded default
 * renders instead, so the public site is fully functional even if this
 * table is empty or the database is unreachable. There is no page/version/
 * block model here at all — this is deliberately not a CMS.
 *
 * Draft/publish (added on top of the same row — no version history, no
 * second table): `hasDraftChange` + `draftTextValue`/`draftFileId` hold a
 * pending, unpublished edit. `textValue`/`fileId` are the published (live)
 * values — the only ones a normal page render or a public visitor ever
 * sees. See ./blocks... — there are no blocks; see `application/use-cases/
 * publish-draft-content-overrides.ts` for the 4-state row lifecycle.
 */

export type ContentOverrideType = "TEXT" | "IMAGE";

export interface ContentOverrideRecord {
  readonly id: string;
  readonly page: string;
  readonly contentKey: string;
  readonly type: ContentOverrideType;
  readonly textValue: string | null;
  readonly fileId: string | null;
  readonly hasDraftChange: boolean;
  readonly draftTextValue: string | null;
  readonly draftFileId: string | null;
  readonly updatedByUserId: string;
  readonly updatedAt: Date;
  readonly createdAt: Date;
}

/** Keyed by `contentKey` — the shape a page's Server Component resolves against its own defaults. */
export type PageContentOverrides = Readonly<Record<string, ContentOverrideRecord>>;

/** A pending draft value for one field — the shape returned by the SECRETARY-only preview read. Never includes the published value (the caller already has that). */
export interface DraftOverrideValue {
  readonly type: ContentOverrideType;
  readonly textValue: string | null;
  readonly fileId: string | null;
}

export type PageDraftOverrides = Readonly<Record<string, DraftOverrideValue>>;

export interface DraftSummary {
  readonly total: number;
  readonly byPage: Readonly<Record<string, number>>;
}

// Mirrors Publication Studio's TEXT (5000) / HEADING (200) limits — an
// override can be either a short label/heading or a longer paragraph, so
// one generous cap covers both without needing a per-field taxonomy.
export const CONTENT_OVERRIDE_TEXT_MAX_LENGTH = 5000;
