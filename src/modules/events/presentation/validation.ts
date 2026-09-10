import { z } from "zod";
import {
  EVENT_BUDGET_NOTES_MAX_LENGTH,
  EVENT_CHECKLIST_LABEL_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_REPORT_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_VENUE_MAX_LENGTH,
} from "../domain/entities";

const EVENT_STATUS_VALUES = ["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"] as const;
const EVENT_PARTICIPANT_ROLE_VALUES = ["COORDINATOR", "VOLUNTEER"] as const;
const EVENT_ATTACHMENT_KIND_VALUES = ["DOCUMENT", "MEDIA"] as const;

export const CreateEventRequestSchema = z.object({
  title: z.string().trim().min(1).max(EVENT_TITLE_MAX_LENGTH),
  description: z.string().trim().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  venue: z.string().trim().max(EVENT_VENUE_MAX_LENGTH).optional(),
  organizerId: z.string().uuid().optional(),
  budgetAmount: z.string().trim().max(20).optional(),
  budgetNotes: z.string().trim().max(EVENT_BUDGET_NOTES_MAX_LENGTH).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  category: z.string().trim().max(80).optional(),
  isPublic: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const UpdateEventRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(EVENT_TITLE_MAX_LENGTH).optional(),
    description: z.string().trim().max(EVENT_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().nullable().optional(),
    venue: z.string().trim().max(EVENT_VENUE_MAX_LENGTH).nullable().optional(),
    budgetAmount: z.string().trim().max(20).nullable().optional(),
    budgetNotes: z.string().trim().max(EVENT_BUDGET_NOTES_MAX_LENGTH).nullable().optional(),
    postEventReport: z.string().trim().max(EVENT_REPORT_MAX_LENGTH).nullable().optional(),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    category: z.string().trim().max(80).nullable().optional(),
    isPublic: z.boolean().optional(),
    featured: z.boolean().optional(),
    coverImageFileId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SearchEventsQuerySchema = z.object({
  status: z.enum(EVENT_STATUS_VALUES).optional(),
  organizerId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  startAtFrom: z.coerce.date().optional(),
  startAtTo: z.coerce.date().optional(),
  sortField: z.enum(["startAt", "createdAt"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const AddEventParticipantRequestSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(EVENT_PARTICIPANT_ROLE_VALUES),
});

export const AddEventChecklistItemRequestSchema = z.object({
  label: z.string().trim().min(1).max(EVENT_CHECKLIST_LABEL_MAX_LENGTH),
});

export const ToggleEventChecklistItemRequestSchema = z.object({
  isDone: z.boolean(),
});

export const EventAttachmentKindSchema = z.enum(EVENT_ATTACHMENT_KIND_VALUES);

export const MarkEventAttendanceRequestSchema = z.object({
  userId: z.string().uuid(),
});
