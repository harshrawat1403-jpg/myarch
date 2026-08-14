import { z } from "zod";
import { REQUEST_DECISION_REASON_MAX_LENGTH, REQUEST_DESCRIPTION_MAX_LENGTH, REQUEST_TYPE_MAX_LENGTH } from "../domain/entities";

const REQUEST_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const REQUEST_STATUS_VALUES = ["SUBMITTED", "REVIEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;
const REQUEST_SORT_FIELD_VALUES = ["createdAt", "deadline", "priority", "updatedAt"] as const;

export const SubmitRequestRequestSchema = z.object({
  type: z.string().trim().min(1).max(REQUEST_TYPE_MAX_LENGTH),
  description: z.string().trim().min(1).max(REQUEST_DESCRIPTION_MAX_LENGTH),
  priority: z.enum(REQUEST_PRIORITY_VALUES).optional(),
});

export const UpdateRequestRequestSchema = z
  .object({
    priority: z.enum(REQUEST_PRIORITY_VALUES).optional(),
    deadline: z.coerce.date().nullable().optional(),
    description: z.string().trim().min(1).max(REQUEST_DESCRIPTION_MAX_LENGTH).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const DecideRequestRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionReason: z.string().trim().max(REQUEST_DECISION_REASON_MAX_LENGTH).optional(),
});

export const AssignRequestRequestSchema = z.object({
  ownerId: z.string().uuid(),
  deadline: z.coerce.date().optional(),
});

export const ReassignRequestRequestSchema = z.object({
  ownerId: z.string().uuid(),
});

export const AddRequestUpdateRequestSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const SearchRequestsQuerySchema = z.object({
  status: z.enum(REQUEST_STATUS_VALUES).optional(),
  type: z.string().trim().min(1).optional(),
  priority: z.enum(REQUEST_PRIORITY_VALUES).optional(),
  requesterId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  sortField: z.enum(REQUEST_SORT_FIELD_VALUES).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
