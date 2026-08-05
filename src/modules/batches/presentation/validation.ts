import { z } from "zod";

export const CreateBatchRequestSchema = z.object({
  name: z.string().trim().min(1, "Batch name is required").max(200),
  year: z.number().int().min(1950).max(2100),
});

export const UpdateBatchRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    year: z.number().int().min(1950).max(2100).optional(),
  })
  .refine((value) => value.name !== undefined || value.year !== undefined, {
    message: "At least one of name or year must be provided",
  });

export const UpdateBatchStatusRequestSchema = z.object({
  status: z.enum(["ACTIVE", "GRADUATED", "ARCHIVED"]),
});
