import { z } from "zod";
import { ACCENT_COLORS, FONT_PAIRINGS } from "../domain/blocks";

const ACCENT_HEXES = ACCENT_COLORS.map((c) => c.hex) as [string, ...string[]];
const FONT_KEYS = FONT_PAIRINGS.map((f) => f.key) as [string, ...string[]];

const BaseBlockSchema = z.object({ id: z.string().min(1), visible: z.boolean() });

const CoverBlockSchema = BaseBlockSchema.extend({
  type: z.literal("COVER"),
  data: z.object({ title: z.string().max(200), subtitle: z.string().max(300).nullable(), imageFileId: z.string().uuid().nullable() }),
});
const HeadingBlockSchema = BaseBlockSchema.extend({
  type: z.literal("HEADING"),
  data: z.object({ text: z.string().max(200), level: z.union([z.literal(1), z.literal(2)]) }),
});
const TextBlockSchema = BaseBlockSchema.extend({
  type: z.literal("TEXT"),
  data: z.object({ text: z.string().max(5000) }),
});
const ImageBlockSchema = BaseBlockSchema.extend({
  type: z.literal("IMAGE"),
  data: z.object({ fileId: z.string().uuid().nullable(), caption: z.string().max(300).nullable() }),
});
const StudentProfileBlockSchema = BaseBlockSchema.extend({
  type: z.literal("STUDENT_PROFILE"),
  data: z.object({ studentProfileId: z.string().uuid() }),
});
const CompanyLogoGridBlockSchema = BaseBlockSchema.extend({
  type: z.literal("COMPANY_LOGO_GRID"),
  data: z.object({ companyIds: z.array(z.string().uuid()).max(100) }),
});
const AlumniProfileBlockSchema = BaseBlockSchema.extend({
  type: z.literal("ALUMNI_PROFILE"),
  data: z.object({ alumniProfileId: z.string().uuid() }),
});
const StatSummaryBlockSchema = BaseBlockSchema.extend({
  type: z.literal("STAT_SUMMARY"),
  data: z.object({ title: z.string().max(200) }),
});
const DividerBlockSchema = BaseBlockSchema.extend({
  type: z.literal("DIVIDER"),
  data: z.object({}),
});
const BackCoverBlockSchema = BaseBlockSchema.extend({
  type: z.literal("BACK_COVER"),
  data: z.object({ text: z.string().max(500).nullable() }),
});

export const PublicationBlockSchema = z.discriminatedUnion("type", [
  CoverBlockSchema,
  HeadingBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  StudentProfileBlockSchema,
  CompanyLogoGridBlockSchema,
  AlumniProfileBlockSchema,
  StatSummaryBlockSchema,
  DividerBlockSchema,
  BackCoverBlockSchema,
]);

export const PublicationStyleSchema = z.object({
  accentColor: z.enum(ACCENT_HEXES),
  fontPairing: z.enum(FONT_KEYS),
});

export const PublicationContentSchema = z.object({
  blocks: z.array(PublicationBlockSchema).max(200),
  style: PublicationStyleSchema,
});

const PAGE_SIZES = ["A4_PORTRAIT", "A4_LANDSCAPE", "A3", "CUSTOM"] as const;

export const CreatePublicationRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  templateId: z.string().uuid(),
  pageSize: z.enum(PAGE_SIZES).default("A4_PORTRAIT"),
  selectedIds: z.array(z.string().uuid()).max(500).optional(),
});

export const UpdatePublicationRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: PublicationContentSchema,
  pageSize: z.enum(PAGE_SIZES),
  expectedVersion: z.number().int().min(1),
});

export const SearchPublicationsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  type: z.enum(["BROCHURE", "BOOKLET", "PORTFOLIO_BOOK", "ANNUAL_REPORT", "NEWSLETTER", "MAGAZINE", "CUSTOM"]).optional(),
});

export const PublishPublicationRequestSchema = z.object({
  label: z.string().trim().max(200).optional(),
});

export const RequestExportRequestSchema = z.object({
  format: z.enum(["PDF", "PPTX", "PNG", "JPEG"]),
});

export const ListSelectableDataQuerySchema = z.object({
  kind: z.enum(["STUDENTS", "COMPANIES", "ALUMNI", "STATS", "NONE"]),
  batchId: z.string().uuid().optional(),
});

export const ListTemplatesQuerySchema = z.object({
  type: z.enum(["BROCHURE", "BOOKLET", "PORTFOLIO_BOOK", "ANNUAL_REPORT", "NEWSLETTER", "MAGAZINE", "CUSTOM"]).optional(),
});
