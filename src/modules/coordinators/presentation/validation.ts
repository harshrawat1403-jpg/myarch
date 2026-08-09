import { z } from "zod";

const CoordinatorPositionSchema = z.enum(["T_AND_P", "ALUMNI"]);

export const CreateCoordinatorRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(200),
  position: CoordinatorPositionSchema.optional(),
  batchIds: z.array(z.string().uuid()).optional(),
});

export const UpdateCoordinatorRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    position: CoordinatorPositionSchema.nullable().optional(),
  })
  .refine((value) => value.fullName !== undefined || value.position !== undefined, {
    message: "At least one field must be provided",
  });

export const SearchCoordinatorsQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
  position: CoordinatorPositionSchema.optional(),
});

export const AssignBatchRequestSchema = z.object({
  batchId: z.string().uuid(),
});

export const BulkSetActiveRequestSchema = z.object({
  coordinatorIds: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});
