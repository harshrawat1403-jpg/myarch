import { z } from "zod";

const optionalUrl = z.union([z.string().trim().url().max(500), z.literal("")]).transform((value) => value || null).optional();

export const TalentProfileInputSchema = z.object({
  professionalHeadline: z.string().trim().max(160).nullable().optional(),
  bio: z.string().trim().max(3000).nullable().optional(),
  specialization: z.string().trim().max(160).nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  linkedInUrl: optionalUrl,
  behanceUrl: optionalUrl,
  portfolioWebsiteUrl: optionalUrl,
  visibility: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).optional(),
  resumeVisible: z.boolean().optional(),
  cgpaVisible: z.boolean().optional(),
  contactVisible: z.boolean().optional(),
  placementAvailable: z.boolean().optional(),
  internshipAvailable: z.boolean().optional(),
});

export const TalentDocumentUploadSchema = z.object({
  kind: z.enum(["RESUME", "PORTFOLIO"]),
  visibility: z.enum(["PRIVATE", "PUBLISHED"]).default("PRIVATE"),
});

export const FeatureTalentSchema = z.object({ featured: z.boolean() });
