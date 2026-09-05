import { z } from "zod";

export class ElectionError extends Error {
  constructor(
    message: string,
    public readonly kind: "validation" | "conflict" | "notFound" = "conflict",
  ) {
    super(message);
  }
}
export type ElectionStatus =
  | "DRAFT"
  | "APPLICATION_OPEN"
  | "APPLICATION_CLOSED"
  | "SCRUTINY"
  | "CORRECTIONS_OBJECTIONS"
  | "SHORTLIST"
  | "INTERVIEWS"
  | "FINAL_CANDIDATES"
  | "VOTING"
  | "COUNTING"
  | "RESULT_REVIEW";
export const voterGroups = ["STUDENT", "FACULTY", "EX_COUNCIL"] as const;
const percent = z.number().min(0).max(100).multipleOf(0.01);
const requiredDate = z.union([z.string().min(1), z.date()]).pipe(z.coerce.date());
const optionalDate = requiredDate.nullable().default(null);
export const electionConfigSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{4}$/)
      .refine(
        (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
        "Use consecutive years, e.g. 2026-2027",
      ),
    type: z.literal("COUNCIL"),
    applicationOpenAt: requiredDate,
    applicationCloseAt: requiredDate,
    correctionOpenAt: optionalDate,
    correctionCloseAt: optionalDate,
    campaignEnabled: z.boolean().default(false),
    campaignOpenAt: optionalDate,
    campaignCloseAt: optionalDate,
    votingOpenAt: optionalDate,
    votingCloseAt: optionalDate,
    notaEnabled: z.boolean().default(false),
    maxPositionsPerCandidate: z.number().int().min(1).max(100).default(1),
    studentQuorumPercent: percent.default(0),
    facultyQuorumPercent: percent.default(0),
    exCouncilQuorumPercent: percent.default(0),
  })
  .strict();
export type ElectionConfig = z.infer<typeof electionConfigSchema>;
export const positionSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).default(""),
    // Council elections use one choice and produce one provisional winner per
    // position. Core Committee selections have their own position schema.
    seats: z
      .number()
      .int()
      .refine((seats): boolean => seats === 1, "Council election positions require one seat"),
    displayOrder: z.number().int().min(0).default(0),
    weights: z
      .array(z.object({ voterGroup: z.enum(voterGroups), percentage: percent }).strict())
      .max(3)
      .default([]),
  })
  .strict();
export type PositionConfig = z.infer<typeof positionSchema>;

export function validateSchedule(config: ElectionConfig): void {
  if (config.applicationOpenAt >= config.applicationCloseAt)
    throw new ElectionError("Application opening must precede closing", "validation");
  let previous = config.applicationCloseAt;
  for (const [open, close, label] of [
    [config.correctionOpenAt, config.correctionCloseAt, "Correction/objection"],
    [config.campaignOpenAt, config.campaignCloseAt, "Campaign"],
    [config.votingOpenAt, config.votingCloseAt, "Voting"],
  ] as const) {
    if (Boolean(open) !== Boolean(close))
      throw new ElectionError(`${label} requires both dates`, "validation");
    if (open && close) {
      if (open < previous || open >= close)
        throw new ElectionError(
          `${label} dates must follow earlier stages and opening must precede closing`,
          "validation",
        );
      previous = close;
    }
  }
  if (config.campaignEnabled !== Boolean(config.campaignOpenAt && config.campaignCloseAt))
    throw new ElectionError("Campaign configuration and dates must agree", "validation");
}
export function assertVotingSchedule(
  config: Pick<ElectionConfig, "votingOpenAt" | "votingCloseAt">,
): asserts config is ElectionConfig & { votingOpenAt: Date; votingCloseAt: Date } {
  if (!config.votingOpenAt || !config.votingCloseAt)
    throw new ElectionError(
      "Configure a voting opening and closing time before voting",
      "validation",
    );
  if (config.votingOpenAt >= config.votingCloseAt)
    throw new ElectionError("Voting opening must precede closing", "validation");
}
export function assertCouncilSingleSeat(positions: readonly { seats: number }[]): void {
  if (positions.some((position) => position.seats !== 1))
    throw new ElectionError("Council election positions must have exactly one seat", "validation");
}
export function validateWeights(weights: PositionConfig["weights"], locked = false): void {
  if (new Set(weights.map((w) => w.voterGroup)).size !== weights.length)
    throw new ElectionError("Duplicate voter group", "validation");
  if (weights.some((w) => !Number.isFinite(w.percentage) || w.percentage < 0 || w.percentage > 100))
    throw new ElectionError("Weight must be between 0 and 100", "validation");
  if (
    locked &&
    (weights.length !== 3 ||
      weights.reduce((sum, w) => sum + Math.round(w.percentage * 100), 0) !== 10000)
  )
    throw new ElectionError(
      "Configure all three voter groups with weights totaling exactly 100%",
      "validation",
    );
}
export function assertDraft(status: ElectionStatus): void {
  if (status !== "DRAFT")
    throw new ElectionError("Election configuration is locked after applications open");
}
export function assertTransition(from: ElectionStatus, to: ElectionStatus): void {
  if (!(
    (from === "DRAFT" && to === "APPLICATION_OPEN") ||
    (from === "APPLICATION_OPEN" && to === "APPLICATION_CLOSED") ||
    (from === "APPLICATION_CLOSED" && to === "SCRUTINY") ||
    (from === "SCRUTINY" && to === "CORRECTIONS_OBJECTIONS") ||
    (from === "CORRECTIONS_OBJECTIONS" && to === "SHORTLIST") ||
    (from === "SHORTLIST" && to === "INTERVIEWS") ||
    (from === "INTERVIEWS" && to === "FINAL_CANDIDATES") ||
    (from === "FINAL_CANDIDATES" && to === "VOTING") ||
    (from === "VOTING" && to === "COUNTING") ||
    (from === "COUNTING" && to === "RESULT_REVIEW")
  ))
    throw new ElectionError(`Invalid election transition: ${from} to ${to}`);
}
