import { z } from "zod";

export const CreateCompanyRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sector: z.string().trim().min(1).max(120).optional(),
  website: z.string().trim().url().max(300).optional(),
});

export const UpdateCompanyRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    sector: z.string().trim().max(120).nullable().optional(),
    website: z.string().trim().url().max(300).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.sector !== undefined || value.website !== undefined, {
    message: "At least one field must be provided",
  });

export const SearchCompaniesQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
