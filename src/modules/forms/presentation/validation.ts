import { z } from "zod";
import { FORM_DESCRIPTION_MAX_LENGTH, FORM_FIELD_DESCRIPTION_MAX_LENGTH, FORM_FIELD_KEY_MAX_LENGTH, FORM_FIELD_LABEL_MAX_LENGTH, FORM_OPTION_MAX_LENGTH, FORM_TITLE_MAX_LENGTH } from "../domain/entities";

const fieldType = z.enum(["TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DROPDOWN", "RADIO", "CHECKBOX", "DATE"]);
const field = z.object({
  key: z.string().trim().min(1).max(FORM_FIELD_KEY_MAX_LENGTH).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  label: z.string().trim().min(1).max(FORM_FIELD_LABEL_MAX_LENGTH),
  type: fieldType,
  description: z.string().trim().max(FORM_FIELD_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(FORM_OPTION_MAX_LENGTH)).max(100).optional(),
  validation: z.object({ min: z.number().finite().optional(), max: z.number().finite().optional() }).nullable().optional(),
  displayOrder: z.number().int().min(0),
});

export const FormFieldsSchema = z.array(field).min(1).max(100);
export const CreateFormRequestSchema = z.object({
  title: z.string().trim().min(1).max(FORM_TITLE_MAX_LENGTH),
  description: z.string().trim().max(FORM_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  deadline: z.coerce.date().nullable().optional(),
  committeeId: z.string().uuid().nullable().optional(),
  fields: FormFieldsSchema,
});
export const UpdateFormRequestSchema = CreateFormRequestSchema.partial().refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });
export const SearchFormsQuerySchema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(), search: z.string().trim().min(1).optional() });

