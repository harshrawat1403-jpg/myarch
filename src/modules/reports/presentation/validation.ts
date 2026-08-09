import { z } from "zod";

const dateStringSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => new Date(v));

export const PlacementReportQuerySchema = z.object({
  type: z.enum(["PLACEMENT", "INTERNSHIP"]),
  batchIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  format: z.enum(["csv", "xlsx", "pptx"]).optional(),
});

export const AlumniReportQuerySchema = z.object({
  graduationYearFrom: z.coerce.number().int().optional(),
  graduationYearTo: z.coerce.number().int().optional(),
  mentorshipAvailableOnly: z.coerce.boolean().optional(),
  format: z.enum(["csv", "xlsx", "pptx"]).optional(),
});

export const PublicationsUsageReportQuerySchema = z.object({
  type: z.enum(["BROCHURE", "BOOKLET", "PORTFOLIO_BOOK", "ANNUAL_REPORT", "NEWSLETTER", "MAGAZINE", "CUSTOM"]).optional(),
  format: z.enum(["csv", "xlsx", "pptx"]).optional(),
});

export const MyActivityReportQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).optional(),
});
