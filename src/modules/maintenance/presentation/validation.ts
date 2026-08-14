import { z } from "zod";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_DESCRIPTION_MAX_LENGTH,
  MAINTENANCE_LOCATION_MAX_LENGTH,
  MAINTENANCE_RESOLUTION_MAX_LENGTH,
  type MaintenanceCategory,
} from "../domain/entities";

const MAINTENANCE_CATEGORY_VALUES = MAINTENANCE_CATEGORIES as [MaintenanceCategory, ...MaintenanceCategory[]];
const MAINTENANCE_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const MAINTENANCE_STATUS_VALUES = [
  "SUBMITTED",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "VERIFIED",
  "CLOSED",
  "REOPENED",
] as const;
const MAINTENANCE_SORT_FIELD_VALUES = ["createdAt", "deadline", "priority", "updatedAt"] as const;

export const ReportMaintenanceIssueRequestSchema = z.object({
  category: z.enum(MAINTENANCE_CATEGORY_VALUES),
  location: z.string().trim().min(1).max(MAINTENANCE_LOCATION_MAX_LENGTH),
  description: z.string().trim().min(1).max(MAINTENANCE_DESCRIPTION_MAX_LENGTH),
  priority: z.enum(MAINTENANCE_PRIORITY_VALUES).optional(),
});

export const UpdateMaintenanceIssueRequestSchema = z
  .object({
    priority: z.enum(MAINTENANCE_PRIORITY_VALUES).optional(),
    deadline: z.coerce.date().nullable().optional(),
    description: z.string().trim().min(1).max(MAINTENANCE_DESCRIPTION_MAX_LENGTH).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const AssignMaintenanceIssueRequestSchema = z.object({
  assigneeId: z.string().uuid(),
  deadline: z.coerce.date().optional(),
});

export const ReassignMaintenanceIssueRequestSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const ResolveMaintenanceIssueRequestSchema = z.object({
  resolutionDetails: z.string().trim().min(1).max(MAINTENANCE_RESOLUTION_MAX_LENGTH),
});

export const AddMaintenanceIssueUpdateRequestSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const SearchMaintenanceIssuesQuerySchema = z.object({
  status: z.enum(MAINTENANCE_STATUS_VALUES).optional(),
  category: z.enum(MAINTENANCE_CATEGORY_VALUES).optional(),
  priority: z.enum(MAINTENANCE_PRIORITY_VALUES).optional(),
  requesterId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  sortField: z.enum(MAINTENANCE_SORT_FIELD_VALUES).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
