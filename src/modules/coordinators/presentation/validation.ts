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

/** MYARCH Phase 1 — key format checked here; membership in COORDINATOR_PERMISSION_KEYS is checked by the use case (the source of truth, so validation and the use case can never drift). */
export const UpdateCoordinatorPermissionsRequestSchema = z.object({
  permissions: z.array(z.string().trim().min(1)),
});

/** MYARCH Maintenance functional hierarchy — null clears the designation. */
export const SetCoordinatorMaintenanceRoleRequestSchema = z.object({
  maintenanceRole: z.enum(["MAINTENANCE_SECRETARY", "MAINTENANCE_COORDINATOR"]).nullable(),
});

/** Same "format here, catalog membership in the use case" split as UpdateCoordinatorPermissionsRequestSchema. */
export const UpdateMaintenanceCoordinatorPermissionsRequestSchema = z.object({
  permissions: z.array(z.string().trim().min(1)),
});
