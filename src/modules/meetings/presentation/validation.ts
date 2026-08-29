import { z } from "zod";
import {
  MEETING_AGENDA_MAX_LENGTH,
  MEETING_DECISIONS_MAX_LENGTH,
  MEETING_NOTES_MAX_LENGTH,
  MEETING_TITLE_MAX_LENGTH,
  MEETING_VENUE_OR_LINK_MAX_LENGTH,
} from "../domain/entities";

const MEETING_STATUS_VALUES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;

export const CreateMeetingRequestSchema = z.object({
  title: z.string().trim().min(1).max(MEETING_TITLE_MAX_LENGTH),
  agenda: z.string().trim().max(MEETING_AGENDA_MAX_LENGTH).optional(),
  startAt: z.coerce.date(),
  venueOrLink: z.string().trim().max(MEETING_VENUE_OR_LINK_MAX_LENGTH).optional(),
  organizerId: z.string().uuid().optional(),
  committeeId: z.string().uuid().optional(),
});

export const UpdateMeetingRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(MEETING_TITLE_MAX_LENGTH).optional(),
    agenda: z.string().trim().max(MEETING_AGENDA_MAX_LENGTH).nullable().optional(),
    startAt: z.coerce.date().optional(),
    venueOrLink: z.string().trim().max(MEETING_VENUE_OR_LINK_MAX_LENGTH).nullable().optional(),
    notes: z.string().trim().max(MEETING_NOTES_MAX_LENGTH).nullable().optional(),
    decisions: z.string().trim().max(MEETING_DECISIONS_MAX_LENGTH).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SearchMeetingsQuerySchema = z.object({
  status: z.enum(MEETING_STATUS_VALUES).optional(),
  organizerId: z.string().uuid().optional(),
  committeeId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  startAtFrom: z.coerce.date().optional(),
  startAtTo: z.coerce.date().optional(),
  sortField: z.enum(["startAt", "createdAt"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const AddMeetingParticipantRequestSchema = z.object({
  userId: z.string().uuid(),
});

export const MarkMeetingAttendanceRequestSchema = z.object({
  userId: z.string().uuid(),
  attended: z.boolean(),
});
