import { z } from "zod";
import {
  COMMITTEE_ACADEMIC_YEAR_MAX_LENGTH,
  COMMITTEE_NAME_MAX_LENGTH,
  COMMITTEE_POSITION_MAX_LENGTH,
  COMMITTEE_RESPONSIBILITIES_MAX_LENGTH,
} from "../domain/entities";

const COMMITTEE_TYPE_VALUES = [
  "STUDENT_COUNCIL",
  "CORE_COMMITTEE",
  "EVENT_COMMITTEE",
  "TECHNICAL_COMMITTEE",
  "PROJECT_TEAM",
  "TEMPORARY_COMMITTEE",
] as const;

const COMMITTEE_STATUS_VALUES = ["ACTIVE", "ARCHIVED"] as const;

export const CreateCommitteeRequestSchema = z.object({
  name: z.string().trim().min(1).max(COMMITTEE_NAME_MAX_LENGTH),
  type: z.enum(COMMITTEE_TYPE_VALUES),
  academicYear: z.string().trim().max(COMMITTEE_ACADEMIC_YEAR_MAX_LENGTH).optional(),
  responsibilities: z.string().trim().max(COMMITTEE_RESPONSIBILITIES_MAX_LENGTH).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const UpdateCommitteeRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(COMMITTEE_NAME_MAX_LENGTH).optional(),
    academicYear: z.string().trim().max(COMMITTEE_ACADEMIC_YEAR_MAX_LENGTH).nullable().optional(),
    responsibilities: z.string().trim().max(COMMITTEE_RESPONSIBILITIES_MAX_LENGTH).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const SearchCommitteesQuerySchema = z.object({
  type: z.enum(COMMITTEE_TYPE_VALUES).optional(),
  status: z.enum(COMMITTEE_STATUS_VALUES).optional(),
  academicYear: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sortField: z.enum(["name", "createdAt"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const AddCommitteeMemberRequestSchema = z.object({
  userId: z.string().uuid(),
  position: z.string().trim().max(COMMITTEE_POSITION_MAX_LENGTH).optional(),
  isLead: z.boolean().optional(),
  academicYear: z.string().trim().max(COMMITTEE_ACADEMIC_YEAR_MAX_LENGTH).optional(),
});

export const UpdateCommitteeMemberRequestSchema = z
  .object({
    position: z.string().trim().max(COMMITTEE_POSITION_MAX_LENGTH).nullable().optional(),
    isLead: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });
