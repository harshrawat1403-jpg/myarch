import { z } from "zod";

const optionalUrl = z.union([z.string().trim().url().max(500), z.literal("")]).transform((value) => value || null).optional();

export const AlumniSelfSignupSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
  fullName: z.string().trim().min(1).max(200),
  graduationYear: z.coerce.number().int().min(1950).max(2100),
  program: z.string().trim().max(160).nullable().optional(),
});

export const AlumniProfileUpdateSchema = z.object({
  currentCompany: z.string().trim().max(200).nullable().optional(),
  currentRole: z.string().trim().max(200).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  linkedInUrl: optionalUrl,
  websiteUrl: optionalUrl,
  bio: z.string().trim().max(3000).nullable().optional(),
  expertise: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  mentorshipAvailable: z.boolean().optional(),
  contributionOptIn: z.boolean().optional(),
  visibility: z.enum(["HIDDEN", "DIRECTORY"]).optional(),
}).refine((input) => Object.keys(input).length > 0, { message: "At least one field must be provided" });

export const CreateImportedAlumniSchema = AlumniSelfSignupSchema.omit({ password: true }).extend({ email: z.string().trim().email().max(320).nullable().optional() });
