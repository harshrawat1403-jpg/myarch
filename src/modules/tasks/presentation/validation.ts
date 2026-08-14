import { z } from "zod";
import { TASK_COMMENT_MAX_LENGTH, TASK_DESCRIPTION_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from "../domain/entities";

const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
const TASK_SORT_FIELD_VALUES = ["createdAt", "deadline", "priority", "updatedAt"] as const;

export const CreateTaskRequestSchema = z.object({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  ownerId: z.string().uuid(),
  deadline: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  relatedEntityType: z.string().trim().min(1).max(100).optional(),
  relatedEntityId: z.string().uuid().optional(),
});

export const UpdateTaskRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH).optional(),
    description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    priority: z.enum(TASK_PRIORITY_VALUES).optional(),
    deadline: z.coerce.date().nullable().optional(),
    reminderAt: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const ReassignTaskRequestSchema = z.object({
  newOwnerId: z.string().uuid(),
});

/** TODO is deliberately excluded — only reachable via creation or ReopenTaskUseCase, never this generic forward-transition endpoint (see domain/task-status.ts). */
export const SetTaskStatusRequestSchema = z.object({
  status: z.enum(["IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]),
});

export const AddTaskCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(TASK_COMMENT_MAX_LENGTH),
});

export const SearchTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  ownerId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  relatedEntityType: z.string().trim().min(1).optional(),
  relatedEntityId: z.string().uuid().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  sortField: z.enum(TASK_SORT_FIELD_VALUES).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
