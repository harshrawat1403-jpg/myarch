import { z } from "zod";

export const RecruiterSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  batchId: z.string().uuid().optional(),
  skills: z
    .string()
    .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))
    .optional(),
  software: z
    .string()
    .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))
    .optional(),
  internshipKeyword: z.string().trim().min(1).optional(),
  certificationKeyword: z.string().trim().min(1).optional(),
  hasInternshipExperience: z.coerce.boolean().optional(),
  hasCertification: z.coerce.boolean().optional(),
});

// V3.0 Administration Platform — admin-side recruiter account schemas.

export const CreateRecruiterAccountRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(200),
  companyName: z.string().trim().min(1).max(200),
});

export const UpdateRecruiterAccountRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
  })
  .refine((value) => value.fullName !== undefined || value.companyName !== undefined, {
    message: "At least one field must be provided",
  });

const RECRUITER_APPROVAL_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const SearchRecruiterAccountsQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(1).optional(),
  approvalStatus: z.enum(RECRUITER_APPROVAL_STATUS_VALUES).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const BulkSetRecruitersActiveRequestSchema = z.object({
  recruiterIds: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});
