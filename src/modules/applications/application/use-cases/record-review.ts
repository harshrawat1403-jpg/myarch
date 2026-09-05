import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { FormApplicationRecord, FormApplicationReviewRecord } from "../../domain/entities";
import { APPLICATION_REVIEW_NOTES_MAX_LENGTH } from "../../domain/entities";
import { canReviewApplication } from "../../domain/permissions";
import { FormApplicationNotFoundError, InvalidFormApplicationTransitionError, ReviewerNotAssignedError } from "../../domain/errors";
import type { ApplicationRepository } from "../ports/application-repository";

export class RecordReviewUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository; auditRecorder: AuditRecorder; notificationService: NotificationService }) {}

  async execute(input: { actor: AuthenticatedActor; applicationId: string; notes: string }): Promise<{ application: FormApplicationRecord; review: FormApplicationReviewRecord }> {
    const notes = input.notes.trim();
    if (!notes || notes.length > APPLICATION_REVIEW_NOTES_MAX_LENGTH) throw new Error("Review notes are required and must be within the allowed length");
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new FormApplicationNotFoundError();
    if (application.electionId) throw new NotAuthorizedError("Election review and decisions are not available in Slice 1");
    if (application.currentStatus !== "SUBMITTED" && application.currentStatus !== "UNDER_REVIEW") {
      throw new InvalidFormApplicationTransitionError(application.currentStatus, "REVIEW");
    }
    if (!canReviewApplication(input.actor, application.reviewers, application.applicantBatchId)) throw new NotAuthorizedError("Not authorized to review this application");
    if (!(await this.deps.applicationRepository.findActiveReviewer(input.applicationId, input.actor.userId)) && input.actor.role !== "SECRETARY") throw new ReviewerNotAssignedError();
    const { application: updated, review } = await this.deps.applicationRepository.recordReview({
      applicationId: input.applicationId,
      reviewerUserId: input.actor.userId,
      notes,
      fromStatus: application.currentStatus,
      changedByUserId: input.actor.userId,
    });
    await this.deps.auditRecorder.record({ actorUserId: input.actor.userId, action: AUDIT_ACTIONS.FORM_APPLICATION_REVIEW_RECORDED, targetEntityType: "FormApplication", targetEntityId: input.applicationId });
    if (application.currentStatus === "SUBMITTED") await this.deps.notificationService.notify({ recipientUserId: application.applicantUserId, template: "FORM_APPLICATION_UNDER_REVIEW", context: { applicationId: input.applicationId, formTitle: application.formTitle } });
    return { application: updated, review };
  }
}
