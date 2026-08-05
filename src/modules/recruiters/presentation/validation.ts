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
