import { z } from "zod";

const DRIVE_TYPE_VALUES = ["PLACEMENT", "INTERNSHIP"] as const;
const DRIVE_STATUS_VALUES = ["DRAFT", "ANNOUNCED", "IN_PROGRESS", "CLOSED"] as const;
const APPLICATION_STATUS_VALUES = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ACCEPTED",
  "ACTIVE",
  "COMPLETED",
  "WITHDRAWN",
] as const;

export const EligibilitySchema = z.object({
  minCgpa: z.coerce.number().min(0).max(10).optional(),
  backlogAllowance: z.boolean().optional(),
  eligibleBatchIds: z.array(z.string().uuid()),
});

export const CreatePlacementDriveRequestSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  type: z.enum(DRIVE_TYPE_VALUES),
  eligibility: EligibilitySchema,
  packageOrStipend: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  applicationDeadline: z.coerce.date().optional(),
});

export const UpdatePlacementDriveRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    eligibility: EligibilitySchema.optional(),
    packageOrStipend: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    applicationDeadline: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SetPlacementDriveStatusRequestSchema = z.object({
  status: z.enum(DRIVE_STATUS_VALUES),
});

export const SearchPlacementDrivesQuerySchema = z.object({
  status: z.enum(DRIVE_STATUS_VALUES).optional(),
  type: z.enum(DRIVE_TYPE_VALUES).optional(),
  companyId: z.string().uuid().optional(),
});

export const UpdateApplicationStatusRequestSchema = z.object({
  toStatus: z.enum(APPLICATION_STATUS_VALUES),
  note: z.string().trim().max(1000).optional(),
});

const INTERVIEW_MODE_VALUES = ["ONLINE", "IN_PERSON", "PHONE"] as const;

export const ScheduleInterviewRequestSchema = z.object({
  scheduledAt: z.coerce.date(),
  mode: z.enum(INTERVIEW_MODE_VALUES),
});

export const UpdateInternshipOutcomeRequestSchema = z.object({
  companyFeedback: z.string().trim().min(1).max(5000),
});

export const SubmitStudentFeedbackRequestSchema = z.object({
  studentFeedback: z.string().trim().min(1).max(5000),
});
