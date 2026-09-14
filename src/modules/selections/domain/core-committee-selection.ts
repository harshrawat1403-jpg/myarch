import { z } from "zod";

export class CoreCommitteeSelectionError extends Error {
  constructor(
    message: string,
    public readonly kind: "validation" | "conflict" | "notFound" = "conflict",
  ) {
    super(message);
  }
}
export const coreCommitteeSelectionStatuses = [
  "DRAFT",
  "APPLICATION_OPEN",
  "APPLICATION_CLOSED",
  "SCRUTINY",
  "CORRECTIONS",
  "SHORTLIST",
  "INTERVIEWS",
  "COUNCIL_REVIEW",
  "SELECTION_DECIDED",
  "PUBLISHED",
  "MEMBERSHIP_CONFIRMED",
  "ARCHIVED",
] as const;
export type CoreCommitteeSelectionStatus = (typeof coreCommitteeSelectionStatuses)[number];
const requiredDate = z
  .union([z.string().min(1), z.date()])
  .pipe(z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), "Use a valid date"));
const optionalDate = requiredDate.nullable().default(null);
export const coreCommitteeSelectionConfigSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    brief: z.string().trim().min(1).max(20_000),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{4}$/)
      .refine(
        (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
        "Use consecutive years, e.g. 2026-2027",
      ),
    applicationOpenAt: requiredDate,
    applicationCloseAt: requiredDate,
    // Retained only so historical API clients and records continue to load.
    // The simplified setup never exposes correction windows.
    correctionOpenAt: optionalDate,
    correctionCloseAt: optionalDate,
    // Legacy input is accepted but cannot change the fixed one-domain rule.
    maxPositionsPerCandidate: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .transform(() => 1),
  })
  .strict();
export type CoreCommitteeSelectionConfig = z.infer<typeof coreCommitteeSelectionConfigSchema>;
export const coreCommitteeSelectionQuestionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]*$/)
      .max(80),
    label: z.string().trim().min(1).max(200),
    type: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DROPDOWN", "RADIO", "CHECKBOX", "DATE"]),
    description: z.string().trim().max(1000).nullable().optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
    validation: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .nullable()
      .optional(),
    displayOrder: z.number().int().min(0),
  })
  .strict();
export type CoreCommitteeSelectionQuestionConfig = z.infer<
  typeof coreCommitteeSelectionQuestionSchema
>;
export function validateCoreCommitteeAnswers(
  questions: readonly CoreCommitteeSelectionQuestionConfig[],
  answers: Record<string, unknown>,
): void {
  const knownKeys = new Set(questions.map((question) => question.key));
  for (const key of Object.keys(answers))
    if (!knownKeys.has(key))
      throw new CoreCommitteeSelectionError(
        `Unknown question for selected position: ${key}`,
        "validation",
      );
  for (const question of questions) {
    const value = answers[question.key];
    if (value === undefined || value === null || value === "") {
      if (question.required)
        throw new CoreCommitteeSelectionError(`${question.label} is required`, "validation");
      continue;
    }
    switch (question.type) {
      case "TEXT":
      case "LONG_TEXT":
      case "EMAIL":
        if (
          typeof value !== "string" ||
          (question.type === "EMAIL" && !/^\S+@\S+\.\S+$/.test(value))
        )
          throw new CoreCommitteeSelectionError(
            `${question.label} has an invalid value`,
            "validation",
          );
        break;
      case "NUMBER":
        if (typeof value !== "number" || !Number.isFinite(value))
          throw new CoreCommitteeSelectionError(`${question.label} must be a number`, "validation");
        if (question.validation?.min !== undefined && value < question.validation.min)
          throw new CoreCommitteeSelectionError(
            `${question.label} is below the minimum`,
            "validation",
          );
        if (question.validation?.max !== undefined && value > question.validation.max)
          throw new CoreCommitteeSelectionError(
            `${question.label} is above the maximum`,
            "validation",
          );
        break;
      case "DROPDOWN":
      case "RADIO":
        if (typeof value !== "string" || !question.options.includes(value))
          throw new CoreCommitteeSelectionError(
            `${question.label} has an invalid option`,
            "validation",
          );
        break;
      case "CHECKBOX":
        if (typeof value !== "boolean")
          throw new CoreCommitteeSelectionError(
            `${question.label} must be true or false`,
            "validation",
          );
        break;
      case "DATE":
        if (typeof value !== "string" || Number.isNaN(Date.parse(value)))
          throw new CoreCommitteeSelectionError(
            `${question.label} must be a valid date`,
            "validation",
          );
        break;
    }
  }
}
export const coreCommitteeSelectionPositionSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).default(""),
    seats: z.number().int().positive().max(1000),
    displayOrder: z.number().int().min(0).default(0),
    questions: z
      .array(coreCommitteeSelectionQuestionSchema)
      .max(20)
      .refine(
        (questions) => new Set(questions.map((question) => question.key)).size === questions.length,
        "Question keys must be unique within a position",
      )
      .optional(),
  })
  .strict();
export type CoreCommitteeSelectionPositionConfig = z.infer<
  typeof coreCommitteeSelectionPositionSchema
>;
export function validateSelectionSchedule(config: CoreCommitteeSelectionConfig): void {
  if (config.applicationOpenAt >= config.applicationCloseAt)
    throw new CoreCommitteeSelectionError("Application opening must precede closing", "validation");
}
export function assertSelectionDraft(status: CoreCommitteeSelectionStatus): void {
  if (status !== "DRAFT")
    throw new CoreCommitteeSelectionError(
      "Selection configuration is locked after applications open",
    );
}
const transitions: Record<CoreCommitteeSelectionStatus, readonly CoreCommitteeSelectionStatus[]> = {
  DRAFT: ["APPLICATION_OPEN"],
  APPLICATION_OPEN: ["APPLICATION_CLOSED"],
  APPLICATION_CLOSED: [],
  SCRUTINY: [],
  CORRECTIONS: [],
  SHORTLIST: [],
  INTERVIEWS: [],
  COUNCIL_REVIEW: [],
  SELECTION_DECIDED: [],
  PUBLISHED: [],
  MEMBERSHIP_CONFIRMED: [],
  ARCHIVED: [],
};
export function assertSelectionTransition(
  from: CoreCommitteeSelectionStatus,
  to: CoreCommitteeSelectionStatus,
): void {
  if (!transitions[from].includes(to))
    throw new CoreCommitteeSelectionError(
      `Invalid Core Committee selection transition: ${from} to ${to}`,
    );
}
