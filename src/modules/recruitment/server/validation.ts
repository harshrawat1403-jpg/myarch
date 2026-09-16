import { z } from "zod";

const optionalMoney = z.coerce.number().nonnegative().max(999_999_999).nullable().optional();

export const CreateRecruitingCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.string().trim().url().max(500).nullable().optional(),
  description: z.string().trim().max(3000).nullable().optional(),
});

export const AddCompanyMembershipSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "RECRUITER"]).default("RECRUITER"),
});

export const CreateOpportunitySchema = z.object({
  companyId: z.string().uuid(),
  type: z.enum(["PLACEMENT", "INTERNSHIP"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  workMode: z.enum(["ONSITE", "HYBRID", "REMOTE"]).nullable().optional(),
  ctc: optionalMoney,
  stipend: optionalMoney,
  internshipDurationMonths: z.coerce.number().int().positive().max(36).nullable().optional(),
  minimumCgpa: z.coerce.number().min(0).max(10).nullable().optional(),
  eligibleProgramCodes: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  eligibleBatchIds: z.array(z.string().uuid()).max(50).default([]),
  deadline: z.coerce.date().nullable().optional(),
  driveDate: z.coerce.date().nullable().optional(),
});

export const UpdateRecruitmentApplicationStatusSchema = z.object({
  status: z.enum(["SHORTLISTED", "SELECTED", "REJECTED"]),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const PlacementOutcomeSchema = z.object({
  status: z.enum(["SEEKING", "PLACED", "HIGHER_STUDIES", "ENTREPRENEURSHIP", "NOT_SEEKING", "OTHER"]),
  companyId: z.string().uuid().nullable().optional(),
  role: z.string().trim().max(200).nullable().optional(),
  ctc: optionalMoney,
  placementDate: z.coerce.date().nullable().optional(),
});
