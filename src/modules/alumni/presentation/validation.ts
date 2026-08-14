import { z } from "zod";
import { scorePasswordStrength } from "@/lib/password-strength";

const urlOrEmpty = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/.+/.test(v), {
  message: "Must be a valid URL",
});

export const CreateAlumniRequestSchema = z.object({
  studentProfileId: z.string().uuid().optional(),
  fullName: z.string().trim().min(1).max(200),
  graduationYear: z.coerce.number().int().min(1950).max(2100),
  currentCompany: z.string().trim().min(1).max(200).optional(),
  designation: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  portfolioUrl: urlOrEmpty.optional(),
  linkedInUrl: urlOrEmpty.optional(),
  mentorshipAvailable: z.boolean().optional(),
});

export const UpdateAlumniRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
    currentCompany: z.string().trim().max(200).nullable().optional(),
    designation: z.string().trim().max(200).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    portfolioUrl: z.string().trim().max(500).nullable().optional(),
    linkedInUrl: z.string().trim().max(500).nullable().optional(),
    mentorshipAvailable: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SearchAlumniQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  graduationYear: z.coerce.number().int().optional(),
  mentorshipAvailable: z.coerce.boolean().optional(),
});

// MYARCH Phase 1 (§2.4) — public self-signup. Same password policy as
// auth's ChangePasswordRequestSchema / recruiters' SignupRecruiterRequestSchema,
// reused via scorePasswordStrength (src/lib/password-strength.ts).
export const SignupAlumniRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(200),
  graduationYear: z.coerce.number().int().min(1950).max(2100),
  password: z.string().refine((pw) => scorePasswordStrength(pw).meetsMinimum, {
    message: "Password must be at least 10 characters and include at least 3 of: lowercase, uppercase, digit, symbol",
  }),
});
