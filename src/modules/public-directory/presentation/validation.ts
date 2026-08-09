import { z } from "zod";

export const PublicDirectoryQuerySchema = z.object({
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
});
