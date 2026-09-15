import { z } from "zod";
import type { AuthenticatedActor } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import {
  CoreCommitteeSelectionError,
  coreCommitteeSelectionConfigSchema,
  coreCommitteeSelectionPositionSchema,
  validateSelectionSchedule,
} from "../domain/core-committee-selection";
import type { CoreCommitteeSelectionRepository } from "./ports/core-committee-selection-repository";
export function requireSelectionSecretary(actor: AuthenticatedActor) {
  if (actor.role !== "SECRETARY")
    throw new NotAuthorizedError("Only the Secretary may administer Core Committee selections");
}
export class CoreCommitteeSelectionUseCases {
  constructor(
    private readonly repository: CoreCommitteeSelectionRepository,
    private readonly notifications: NotificationService,
  ) {}
  async list(actor: AuthenticatedActor) {
    if (actor.role !== "SECRETARY" && actor.role !== "STUDENT")
      throw new NotAuthorizedError(
        "Core Committee selection access is limited to students and the Secretary",
      );
    return this.repository.list(actor.role === "SECRETARY");
  }
  async get(actor: AuthenticatedActor, id: string) {
    const selection = await this.repository.get(id);
    if (!selection || (actor.role !== "SECRETARY" && selection.status === "DRAFT"))
      throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    return selection;
  }
  async create(actor: AuthenticatedActor, input: unknown) {
    requireSelectionSecretary(actor);
    const value = coreCommitteeSelectionConfigSchema.parse(input);
    validateSelectionSchedule(value);
    return this.repository.create(value, actor.userId);
  }
  async update(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSelectionSecretary(actor);
    const value = coreCommitteeSelectionConfigSchema.parse(input);
    validateSelectionSchedule(value);
    return this.repository.update(id, value, actor.userId);
  }
  async extendDeadline(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    requireSelectionSecretary(actor);
    const newClosingDate = z.union([z.string().datetime(), z.date()]).pipe(z.coerce.date()).parse(input);
    return this.repository.extendDeadline({ selectionId, newClosingDate, actorUserId: actor.userId });
  }
  async savePosition(
    actor: AuthenticatedActor,
    selectionId: string,
    positionId: string | null,
    input: unknown,
  ) {
    requireSelectionSecretary(actor);
    return this.repository.savePosition(
      selectionId,
      positionId,
      coreCommitteeSelectionPositionSchema.parse(input),
      actor.userId,
    );
  }
  async linkForm(actor: AuthenticatedActor, selectionId: string, formId: string) {
    requireSelectionSecretary(actor);
    return this.repository.linkForm(selectionId, formId, actor.userId);
  }
  async deletePosition(actor: AuthenticatedActor, selectionId: string, positionId: string) {
    requireSelectionSecretary(actor);
    return this.repository.deletePosition({ selectionId, positionId, actorUserId: actor.userId });
  }
  async transition(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    requireSelectionSecretary(actor);
    const status = z
      .enum([
        "APPLICATION_OPEN",
        "APPLICATION_CLOSED",
      ])
      .parse(input);
    return this.repository.transition(selectionId, status, actor.userId);
  }
  async candidates(actor: AuthenticatedActor, selectionId: string) {
    await this.get(actor, selectionId);
    if (actor.role === "SECRETARY") return this.repository.candidates(selectionId);
    if (actor.role === "STUDENT") return this.repository.candidates(selectionId, actor.userId);
    throw new NotAuthorizedError(
      "Core Committee candidate access is limited to students and the Secretary",
    );
  }
  async processing(actor: AuthenticatedActor, selectionId: string) {
    await this.get(actor, selectionId);
    if (actor.role === "SECRETARY") return this.repository.internalProcessing(selectionId);
    if (actor.role !== "STUDENT")
      throw new NotAuthorizedError(
        "Only current Council members may access Core Committee review data",
      );
    const council = await this.repository.currentCouncilCommittee(selectionId, actor.userId);
    if (!council)
      throw new NotAuthorizedError(
        "Only active current Council members may access Core Committee review data",
      );
    return this.repository.councilProcessing(selectionId);
  }
  async scrutiny(
    actor: AuthenticatedActor,
    selectionId: string,
    candidateId: string,
    input: unknown,
  ) {
    requireSelectionSecretary(actor);
    const value = z
      .object({
        decision: z.enum(["ELIGIBLE", "INELIGIBLE", "CORRECTION_REQUIRED"]),
        reason: z.string().trim().min(1).max(5000),
      })
      .strict()
      .parse(input);
    return this.repository.recordScrutiny({
      selectionId,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async correction(
    actor: AuthenticatedActor,
    selectionId: string,
    candidateId: string,
    input: unknown,
  ) {
    if (actor.role === "SECRETARY") {
      const value = z
        .object({ instructions: z.string().trim().min(1).max(5000) })
        .strict()
        .parse(input);
      return this.repository.requestCorrection({
        selectionId,
        candidateId,
        ...value,
        actorUserId: actor.userId,
      });
    }
    if (actor.role !== "STUDENT")
      throw new NotAuthorizedError("Only the candidate may submit a correction");
    const value = z
      .object({ statement: z.string().trim().min(1).max(10000) })
      .strict()
      .parse(input);
    return this.repository.submitCorrection({
      selectionId,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async shortlist(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    requireSelectionSecretary(actor);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionIds: z.array(z.string().uuid()).min(1).max(100),
        shortlisted: z.boolean().default(true),
      })
      .strict()
      .parse(input);
    const result = await this.repository.shortlist({ selectionId, ...value, actorUserId: actor.userId });
    return result;
  }
  async publishShortlist(actor: AuthenticatedActor, selectionId: string) {
    requireSelectionSecretary(actor);
    const result = await this.repository.publishShortlist({
      selectionId,
      actorUserId: actor.userId,
    });
    if (!result.idempotent && result.notificationRecipients) {
      await this.notifyUnique(
        result.notificationRecipients.shortlistedCandidateUserIds ?? [],
        "CORE_COMMITTEE_SELECTION_SHORTLISTED",
        {
          selectionId: result.notificationRecipients.selectionId,
          selectionTitle: result.notificationRecipients.selectionTitle,
        },
      );
      await this.notifyUnique(
        result.notificationRecipients.notShortlistedCandidateUserIds ?? [],
        "CORE_COMMITTEE_SELECTION_NOT_SHORTLISTED",
        {
          selectionId: result.notificationRecipients.selectionId,
          selectionTitle: result.notificationRecipients.selectionTitle,
        },
      );
    }
    return result;
  }
  async interview(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    await this.councilOrSecretary(actor, selectionId);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionId: z.string().uuid(),
        scheduledAt: z
          .union([z.string().datetime(), z.date()])
          .transform((value) => new Date(value)),
        durationMinutes: z.number().int().positive().max(1440),
        mode: z.enum(["IN_PERSON", "ONLINE"]),
        location: z.string().trim().max(2000).optional(),
        candidateInstructions: z.string().trim().max(5000).optional(),
        internalNotes: z.string().trim().max(10000).optional(),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.scheduledAt <= new Date())
          context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Interview time must be in the future" });
        if (value.mode === "IN_PERSON" && !value.location)
          context.addIssue({ code: "custom", path: ["location"], message: "Venue is required for in-person interviews" });
        if (value.mode === "ONLINE" && !value.location)
          context.addIssue({ code: "custom", path: ["location"], message: "Meeting link is required for online interviews" });
      })
      .parse(input);
    const result = await this.repository.createInterview({ selectionId, ...value, actorUserId: actor.userId });
    await this.notifyUnique([result.candidateUserId], "CORE_COMMITTEE_SELECTION_INTERVIEW_SCHEDULED", {
      selectionId,
      selectionTitle: result.selectionTitle,
      scheduledAt: value.scheduledAt.toISOString(),
    });
    return result;
  }
  async completeInterview(
    actor: AuthenticatedActor,
    selectionId: string,
    interviewId: string,
    input: unknown,
  ) {
    await this.councilOrSecretary(actor, selectionId);
    const value = z.object({ candidateAttended: z.boolean() }).strict().parse(input);
    return this.repository.completeInterview({
      selectionId,
      interviewId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async rescheduleInterview(
    actor: AuthenticatedActor,
    selectionId: string,
    interviewId: string,
    input: unknown,
  ) {
    await this.councilOrSecretary(actor, selectionId);
    const value = z.object({
      scheduledAt: z.union([z.string().datetime(), z.date()]).transform((date) => new Date(date)),
      durationMinutes: z.number().int().positive().max(1440),
      mode: z.enum(["IN_PERSON", "ONLINE"]),
      location: z.string().trim().max(2000).optional(),
      candidateInstructions: z.string().trim().max(5000).optional(),
      internalNotes: z.string().trim().max(10000).optional(),
    }).strict().superRefine((value, context) => {
      if (value.scheduledAt <= new Date())
        context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Interview time must be in the future" });
      if (value.mode === "IN_PERSON" && !value.location)
        context.addIssue({ code: "custom", path: ["location"], message: "Venue is required for in-person interviews" });
      if (value.mode === "ONLINE" && !value.location)
        context.addIssue({ code: "custom", path: ["location"], message: "Meeting link is required for online interviews" });
    }).parse(input);
    const result = await this.repository.rescheduleInterview({ selectionId, interviewId, ...value, actorUserId: actor.userId });
    await this.notifyUnique([result.candidateUserId], "CORE_COMMITTEE_SELECTION_INTERVIEW_RESCHEDULED", {
      selectionId, selectionTitle: result.selectionTitle, scheduledAt: value.scheduledAt.toISOString(),
    });
    return result;
  }
  async cancelInterview(
    actor: AuthenticatedActor,
    selectionId: string,
    interviewId: string,
    input: unknown,
  ) {
    await this.councilOrSecretary(actor, selectionId);
    const value = z.object({ reason: z.string().trim().max(5000).optional() }).strict().parse(input);
    const result = await this.repository.cancelInterview({ selectionId, interviewId, ...value, actorUserId: actor.userId });
    await this.notifyUnique([result.candidateUserId], "CORE_COMMITTEE_SELECTION_INTERVIEW_CANCELLED", {
      selectionId, selectionTitle: result.selectionTitle,
    });
    return result;
  }
  private async council(actor: AuthenticatedActor, selectionId: string) {
    if (actor.role !== "STUDENT")
      throw new NotAuthorizedError(
        "Only active current Council members may record Core Committee review or decisions",
      );
    const councilCommitteeId = await this.repository.currentCouncilCommittee(
      selectionId,
      actor.userId,
    );
    if (!councilCommitteeId)
      throw new NotAuthorizedError(
        "Only active current Council members may record Core Committee review or decisions",
      );
    return councilCommitteeId;
  }
  private async councilOrSecretary(actor: AuthenticatedActor, selectionId: string) {
    if (actor.role === "SECRETARY") return;
    return this.council(actor, selectionId);
  }
  async review(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    const councilCommitteeId = await this.council(actor, selectionId);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionId: z.string().uuid(),
        note: z.string().trim().min(1).max(10000),
      })
      .strict()
      .parse(input);
    return this.repository.recordCouncilReview({
      selectionId,
      councilCommitteeId,
      councilMemberUserId: actor.userId,
      ...value,
    });
  }
  async decision(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    const councilCommitteeId = await this.council(actor, selectionId);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionId: z.string().uuid(),
        outcome: z.enum(["SELECTED", "NOT_SELECTED"]),
        internalNote: z.string().trim().min(1).max(10000),
      })
      .strict()
      .parse(input);
    return this.repository.recordDecision({
      selectionId,
      councilCommitteeId,
      councilMemberUserId: actor.userId,
      ...value,
    });
  }
  async secretaryDecision(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    requireSelectionSecretary(actor);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionId: z.string().uuid(),
        outcome: z.enum(["SELECTED", "NOT_SELECTED"]),
      })
      .strict()
      .parse(input);
    return this.repository.recordSecretaryDecision({
      selectionId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async finalizeDecision(actor: AuthenticatedActor, selectionId: string, decisionId: string) {
    requireSelectionSecretary(actor);
    return this.repository.finalizeDecision({ selectionId, decisionId, actorUserId: actor.userId });
  }
  async publishedResults(actor: AuthenticatedActor, selectionId: string) {
    await this.get(actor, selectionId);
    return this.repository.publishedResults(selectionId);
  }
  async publish(actor: AuthenticatedActor, selectionId: string) {
    await this.councilOrSecretary(actor, selectionId);
    const result = await this.repository.publish({ selectionId, actorUserId: actor.userId });
    if (!result.idempotent && result.notificationRecipients) {
      const recipients = result.notificationRecipients;
      await this.notifyUnique(recipients.candidateUserIds, "CORE_COMMITTEE_SELECTION_RESULT_PUBLISHED", {
        selectionId: recipients.selectionId,
        selectionTitle: recipients.selectionTitle,
      });
      await this.notifyUnique(
        recipients.selectedCandidateUserIds,
        "CORE_COMMITTEE_SELECTION_SELECTED",
        { selectionId: recipients.selectionId, selectionTitle: recipients.selectionTitle },
      );
      const selected = new Set(recipients.selectedCandidateUserIds);
      await this.notifyUnique(
        recipients.notSelectedCandidateUserIds.filter((userId) => !selected.has(userId)),
        "CORE_COMMITTEE_SELECTION_NOT_SELECTED",
        { selectionId: recipients.selectionId, selectionTitle: recipients.selectionTitle },
      );
    }
    return result;
  }
  async appointmentPreview(actor: AuthenticatedActor, selectionId: string) {
    requireSelectionSecretary(actor);
    return this.repository.appointmentPreview(selectionId);
  }
  async confirmAppointments(actor: AuthenticatedActor, selectionId: string) {
    requireSelectionSecretary(actor);
    const result = await this.repository.confirmAppointments({ selectionId, actorUserId: actor.userId });
    if (!result.idempotent && result.notificationRecipients)
      await this.notifyUnique(
        result.notificationRecipients.selectedCandidateUserIds,
        "CORE_COMMITTEE_SELECTION_MEMBERSHIP_CONFIRMED",
        result.notificationRecipients,
      );
    return result;
  }
  async archive(actor: AuthenticatedActor, selectionId: string) {
    requireSelectionSecretary(actor);
    return this.repository.archive({ selectionId, actorUserId: actor.userId });
  }
  async delete(actor: AuthenticatedActor, selectionId: string, input: unknown) {
    requireSelectionSecretary(actor);
    const confirmation = z.object({ confirmation: z.string().optional() }).strict().parse(input).confirmation;
    return this.repository.delete({ selectionId, actorUserId: actor.userId, confirmation });
  }
  private async notifyUnique(
    recipientUserIds: readonly string[],
    template:
      | "CORE_COMMITTEE_SELECTION_RESULT_PUBLISHED"
      | "CORE_COMMITTEE_SELECTION_SELECTED"
      | "CORE_COMMITTEE_SELECTION_NOT_SELECTED"
      | "CORE_COMMITTEE_SELECTION_MEMBERSHIP_CONFIRMED"
      | "CORE_COMMITTEE_SELECTION_SHORTLISTED"
      | "CORE_COMMITTEE_SELECTION_NOT_SHORTLISTED"
      | "CORE_COMMITTEE_SELECTION_INTERVIEW_SCHEDULED"
      | "CORE_COMMITTEE_SELECTION_INTERVIEW_RESCHEDULED"
      | "CORE_COMMITTEE_SELECTION_INTERVIEW_CANCELLED",
    context: Record<string, unknown>,
  ) {
    await Promise.all(
      [...new Set(recipientUserIds)].map((recipientUserId) =>
        this.notifications.notify({ recipientUserId, template, context }),
      ),
    );
  }
}
