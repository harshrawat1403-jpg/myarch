import { z } from "zod";
import { ANNOUNCEMENT_CONTENT_MAX_LENGTH, ANNOUNCEMENT_TITLE_MAX_LENGTH } from "../domain/entities";

const AUDIENCE_TYPE_VALUES = ["EVERYONE", "YEAR", "PROGRAM", "COMMITTEE", "COUNCIL", "COORDINATORS", "SELECTED_GROUP"] as const;
const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const CreateAnnouncementRequestSchema = z.object({
  title: z.string().trim().min(1).max(ANNOUNCEMENT_TITLE_MAX_LENGTH),
  content: z.string().trim().min(1).max(ANNOUNCEMENT_CONTENT_MAX_LENGTH),
  priority: z.enum(PRIORITY_VALUES).optional(),
  audienceType: z.enum(AUDIENCE_TYPE_VALUES),
  audienceValue: z.string().trim().max(200).optional(),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  selectedRecipientUserIds: z.array(z.string().uuid()).max(500).optional(),
});

export const UpdateAnnouncementRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(ANNOUNCEMENT_TITLE_MAX_LENGTH).optional(),
    content: z.string().trim().min(1).max(ANNOUNCEMENT_CONTENT_MAX_LENGTH).optional(),
    priority: z.enum(PRIORITY_VALUES).optional(),
    audienceType: z.enum(AUDIENCE_TYPE_VALUES).optional(),
    audienceValue: z.string().trim().max(200).nullable().optional(),
    publishAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    selectedRecipientUserIds: z.array(z.string().uuid()).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SearchAnnouncementsQuerySchema = z.object({
  audienceType: z.enum(AUDIENCE_TYPE_VALUES).optional(),
  authorId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  sortField: z.enum(["publishAt", "createdAt"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
