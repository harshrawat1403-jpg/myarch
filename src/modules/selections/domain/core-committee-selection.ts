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
const requiredDate = z.union([z.string().min(1), z.date()]).pipe(z.coerce.date());
const optionalDate = requiredDate.nullable().default(null);
export const coreCommitteeSelectionConfigSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{4}$/)
      .refine(
        (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
        "Use consecutive years, e.g. 2026-2027",
      ),
    applicationOpenAt: requiredDate,
    applicationCloseAt: requiredDate,
    correctionOpenAt: optionalDate,
    correctionCloseAt: optionalDate,
    maxPositionsPerCandidate: z.number().int().min(1).max(100).default(1),
  })
  .strict();
export type CoreCommitteeSelectionConfig = z.infer<typeof coreCommitteeSelectionConfigSchema>;
export const coreCommitteeSelectionPositionSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).default(""),
    seats: z.number().int().positive().max(1000),
    displayOrder: z.number().int().min(0).default(0),
  })
  .strict();
export type CoreCommitteeSelectionPositionConfig = z.infer<
  typeof coreCommitteeSelectionPositionSchema
>;
export function validateSelectionSchedule(config: CoreCommitteeSelectionConfig): void {
  if (config.applicationOpenAt >= config.applicationCloseAt)
    throw new CoreCommitteeSelectionError("Application opening must precede closing", "validation");
  if (Boolean(config.correctionOpenAt) !== Boolean(config.correctionCloseAt))
    throw new CoreCommitteeSelectionError(
      "Correction dates require both opening and closing times",
      "validation",
    );
  if (
    config.correctionOpenAt &&
    config.correctionCloseAt &&
    (config.correctionOpenAt < config.applicationCloseAt ||
      config.correctionOpenAt >= config.correctionCloseAt)
  )
    throw new CoreCommitteeSelectionError(
      "Correction dates must follow applications and open before closing",
      "validation",
    );
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
  APPLICATION_CLOSED: ["SCRUTINY"],
  SCRUTINY: ["CORRECTIONS", "SHORTLIST"],
  CORRECTIONS: ["SHORTLIST"],
  SHORTLIST: ["INTERVIEWS"],
  INTERVIEWS: ["COUNCIL_REVIEW"],
  COUNCIL_REVIEW: ["SELECTION_DECIDED"],
  SELECTION_DECIDED: ["PUBLISHED"],
  PUBLISHED: ["MEMBERSHIP_CONFIRMED"],
  MEMBERSHIP_CONFIRMED: ["ARCHIVED"],
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
