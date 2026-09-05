import { z } from "zod";
import { APPLICATION_DECISION_REASON_MAX_LENGTH, APPLICATION_REVIEW_NOTES_MAX_LENGTH } from "../domain/entities";

export const SubmitFormRequestSchema = z.object({ answers: z.record(z.string(), z.unknown()), electionPositionIds: z.array(z.string().uuid()).min(1).max(100).optional(), coreCommitteeSelectionPositionIds: z.array(z.string().uuid()).min(1).max(100).optional() }).refine((value) => !(value.electionPositionIds?.length && value.coreCommitteeSelectionPositionIds?.length), "A form submission cannot target both an election and a Core Committee selection");
export const AssignReviewerRequestSchema = z.object({ reviewerUserId: z.string().uuid() });
export const ReviewRequestSchema = z.object({ notes: z.string().trim().min(1).max(APPLICATION_REVIEW_NOTES_MAX_LENGTH) });
export const DecisionRequestSchema = z.object({
  status: z.enum(["SELECTED", "REJECTED"]),
  reason: z.string().trim().max(APPLICATION_DECISION_REASON_MAX_LENGTH).nullable().optional(),
});
export const ApplicationSearchQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "SELECTED", "REJECTED"]).optional(),
});
