import { z } from "zod";

const DIRECTORY_ROLE_VALUES = ["SECRETARY", "COORDINATOR", "STUDENT", "RECRUITER"] as const;

export const SearchDirectoryQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  role: z.enum(DIRECTORY_ROLE_VALUES).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
