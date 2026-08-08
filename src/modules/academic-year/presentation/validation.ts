import { z } from "zod";

const BATCH_STATUS_VALUES = ["ACTIVE", "GRADUATED", "ARCHIVED"] as const;

export const ComputeTransitionPlanRequestSchema = z.object({
  graduateBatchIds: z.array(z.string().uuid()),
  archiveBatchIds: z.array(z.string().uuid()),
  newIntake: z.object({
    name: z.string().trim().min(1).max(200),
    year: z.number().int().min(1950).max(2100),
  }),
  coordinatorIds: z.array(z.string().uuid()),
});

const TransitionBatchActionSchema = z.object({
  batchId: z.string().uuid(),
  batchName: z.string().trim().min(1),
  fromStatus: z.enum(BATCH_STATUS_VALUES),
  toStatus: z.enum(BATCH_STATUS_VALUES),
});

const TransitionPlanSchema = z.object({
  graduations: z.array(TransitionBatchActionSchema),
  archivals: z.array(TransitionBatchActionSchema),
  newIntake: z.object({
    name: z.string().trim().min(1).max(200),
    year: z.number().int().min(1950).max(2100),
  }),
  coordinatorAssignments: z.array(
    z.object({
      coordinatorId: z.string().uuid(),
      coordinatorName: z.string().trim().min(1),
    }),
  ),
});

export const StartAcademicYearTransitionRequestSchema = z.object({
  plan: TransitionPlanSchema,
  confirmationText: z.string(),
});
