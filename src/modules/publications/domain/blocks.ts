/**
 * V4.0 E3-E5 (§13) — the block-tree vocabulary the whole studio operates on.
 * Deliberately a closed, discriminated-union set of block *kinds*, not a
 * freeform shape — §13.2 explicitly rules out arbitrary positioning/shapes/
 * layers for V4.0. Reordering, showing/hiding, and editing all operate on
 * this list; there is no x/y/z coordinate anywhere in this file.
 *
 * Data-bound blocks (STUDENT_PROFILE/COMPANY_LOGO_GRID/ALUMNI_PROFILE/
 * STAT_SUMMARY) store only a reference id, never a copy of the underlying
 * record — resolved live by the renderer at preview/export time. This is the
 * literal implementation of §13.1 step 2's "never copy-pasted/retyped."
 */
export type PublicationBlockType =
  | "COVER"
  | "HEADING"
  | "TEXT"
  | "IMAGE"
  | "STUDENT_PROFILE"
  | "COMPANY_LOGO_GRID"
  | "ALUMNI_PROFILE"
  | "STAT_SUMMARY"
  | "DIVIDER"
  | "BACK_COVER";

interface BaseBlock {
  readonly id: string;
  readonly visible: boolean;
}

export interface CoverBlock extends BaseBlock {
  readonly type: "COVER";
  readonly data: { readonly title: string; readonly subtitle: string | null; readonly imageFileId: string | null };
}

export interface HeadingBlock extends BaseBlock {
  readonly type: "HEADING";
  readonly data: { readonly text: string; readonly level: 1 | 2 };
}

export interface TextBlock extends BaseBlock {
  readonly type: "TEXT";
  readonly data: { readonly text: string };
}

export interface ImageBlock extends BaseBlock {
  readonly type: "IMAGE";
  readonly data: { readonly fileId: string | null; readonly caption: string | null };
}

/** Live-resolved from PublishedProfile at render time — see PublicationDataLookup. */
export interface StudentProfileBlockType extends BaseBlock {
  readonly type: "STUDENT_PROFILE";
  readonly data: { readonly studentProfileId: string };
}

/** Live-resolved from Company at render time. */
export interface CompanyLogoGridBlock extends BaseBlock {
  readonly type: "COMPANY_LOGO_GRID";
  readonly data: { readonly companyIds: readonly string[] };
}

/** Live-resolved from AlumniProfile at render time. */
export interface AlumniProfileBlockType extends BaseBlock {
  readonly type: "ALUMNI_PROFILE";
  readonly data: { readonly alumniProfileId: string };
}

/** Real placement-cycle counts, always computed live — never a stored number that can drift (§11's own "never a separately-maintained summary" rule, applied here too). */
export interface StatSummaryBlock extends BaseBlock {
  readonly type: "STAT_SUMMARY";
  readonly data: { readonly title: string };
}

export interface DividerBlock extends BaseBlock {
  readonly type: "DIVIDER";
  readonly data: Record<string, never>;
}

export interface BackCoverBlock extends BaseBlock {
  readonly type: "BACK_COVER";
  readonly data: { readonly text: string | null };
}

export type PublicationBlock =
  | CoverBlock
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | StudentProfileBlockType
  | CompanyLogoGridBlock
  | AlumniProfileBlockType
  | StatSummaryBlock
  | DividerBlock
  | BackCoverBlock;

/** The kinds of block a template can auto-populate at creation time (§13.1 step 2). NONE templates start static — every block is manually authored. */
export type PublicationDataBindingKind = "STUDENTS" | "COMPANIES" | "ALUMNI" | "STATS" | "NONE";

export interface PublicationStyle {
  readonly accentColor: string;
  readonly fontPairing: string;
}

export interface PublicationContent {
  readonly blocks: readonly PublicationBlock[];
  readonly style: PublicationStyle;
}

/** A small, curated palette — §13.1 step 3: "not arbitrary typography." */
export const ACCENT_COLORS = [
  { key: "indigo", label: "Indigo", hex: "#4F46E5" },
  { key: "teal", label: "Teal", hex: "#0D9488" },
  { key: "rose", label: "Rose", hex: "#E11D48" },
  { key: "amber", label: "Amber", hex: "#D97706" },
  { key: "emerald", label: "Emerald", hex: "#059669" },
  { key: "slate", label: "Slate", hex: "#334155" },
] as const;

/** Web-safe stacks only — the renderer runs standalone (Playwright `page.setContent`), so it can't rely on the app's bundled fonts. */
export const FONT_PAIRINGS = [
  { key: "classic", label: "Classic", heading: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif" },
  { key: "modern", label: "Modern", heading: "Arial, Helvetica, sans-serif", body: "Arial, Helvetica, sans-serif" },
  { key: "editorial", label: "Editorial", heading: "Georgia, 'Times New Roman', serif", body: "Arial, Helvetica, sans-serif" },
  { key: "bold", label: "Bold", heading: "'Arial Black', Arial, sans-serif", body: "Arial, Helvetica, sans-serif" },
] as const;

export type AccentColorKey = (typeof ACCENT_COLORS)[number]["key"];
export type FontPairingKey = (typeof FONT_PAIRINGS)[number]["key"];

export const DEFAULT_STYLE: PublicationStyle = { accentColor: ACCENT_COLORS[0].hex, fontPairing: FONT_PAIRINGS[0].key };

export function findAccentColor(hex: string) {
  return ACCENT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) ?? ACCENT_COLORS[0];
}

export function findFontPairing(key: string) {
  return FONT_PAIRINGS.find((f) => f.key === key) ?? FONT_PAIRINGS[0];
}
