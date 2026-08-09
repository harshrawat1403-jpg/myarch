import { z } from "zod";

export const GlobalSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});
