import { z } from "zod";

export const SubmitRegistrationRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(200),
  rollNumber: z.string().trim().min(1).max(50),
  batchId: z.string().uuid(),
  phone: z.string().trim().min(1).max(20).optional(),
  personalEmail: z.string().trim().email().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const SearchRegistrationRequestsQuerySchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWED", "NEEDS_ATTENTION", "APPROVED", "REJECTED"]).optional(),
  batchId: z.string().uuid().optional(),
});

export const MarkRegistrationRequestSchema = z.object({
  status: z.enum(["REVIEWED", "NEEDS_ATTENTION"]),
  comment: z.string().trim().min(1).max(2000),
});

export const DecideRegistrationRequestSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((value) => value.decision !== "REJECT" || value.rejectionReason !== undefined, {
    message: "A rejection reason is required",
    path: ["rejectionReason"],
  });
