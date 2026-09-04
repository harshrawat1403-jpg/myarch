import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { FormApplicationReviewerRecord } from "../../domain/entities";
import { canAssignReviewer } from "../../domain/permissions";
import { ApplicationAlreadyDecidedError, FormApplicationNotFoundError, ReviewerAlreadyAssignedError, ReviewerNotFoundError } from "../../domain/errors";
import type { ApplicationRepository } from "../ports/application-repository";
import type { ReviewerLookup } from "../ports/reviewer-lookup";

export class AssignReviewerUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository; reviewerLookup: ReviewerLookup; auditRecorder: AuditRecorder; notificationService: NotificationService }) {}

  async execute(input: { actor: AuthenticatedActor; applicationId: string; reviewerUserId: string }): Promise<FormApplicationReviewerRecord> {
    if (!canAssignReviewer(input.actor)) throw new NotAuthorizedError("Only the Secretary may assign reviewers");
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new FormApplicationNotFoundError();
    if (application.currentStatus === "SELECTED" || application.currentStatus === "REJECTED") throw new ApplicationAlreadyDecidedError();
    const reviewer = await this.deps.reviewerLookup.findByUserId(input.reviewerUserId);
    if (!reviewer || !reviewer.isActive || (reviewer.role !== "SECRETARY" && reviewer.role !== "COORDINATOR")) throw new ReviewerNotFoundError();
    if (await this.deps.applicationRepository.findActiveReviewer(input.applicationId, input.reviewerUserId)) throw new ReviewerAlreadyAssignedError();
    const assignment = await this.deps.applicationRepository.assignReviewer(input.applicationId, input.reviewerUserId, input.actor.userId);
    await this.deps.auditRecorder.record({ actorUserId: input.actor.userId, action: AUDIT_ACTIONS.FORM_APPLICATION_REVIEWER_ASSIGNED, targetEntityType: "FormApplication", targetEntityId: input.applicationId, metadata: { reviewerUserId: input.reviewerUserId } });
    await this.deps.notificationService.notify({ recipientUserId: input.reviewerUserId, template: "FORM_APPLICATION_REVIEWER_ASSIGNED", context: { applicationId: input.applicationId, formTitle: application.formTitle } });
    return assignment;
  }
}
