import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { FormApplicationRecord, FormApplicationStatus } from "../../domain/entities";
import { APPLICATION_DECISION_REASON_MAX_LENGTH } from "../../domain/entities";
import { canDecideApplication } from "../../domain/permissions";
import { ApplicationAlreadyDecidedError, FormApplicationNotFoundError, InvalidFormApplicationTransitionError } from "../../domain/errors";
import { isValidFormApplicationTransition } from "../../domain/lifecycle";
import type { ApplicationRepository } from "../ports/application-repository";

export class DecideApplicationUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository; auditRecorder: AuditRecorder; notificationService: NotificationService }) {}

  async execute(input: { actor: AuthenticatedActor; applicationId: string; status: Extract<FormApplicationStatus, "SELECTED" | "REJECTED">; reason?: string }): Promise<FormApplicationRecord> {
    if (!canDecideApplication(input.actor)) throw new NotAuthorizedError("Only the Secretary may make the final decision");
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new FormApplicationNotFoundError();
    if (application.electionId || application.selectionId) throw new NotAuthorizedError("Governance selection review and decisions are not available here");
    if (application.currentStatus === "SELECTED" || application.currentStatus === "REJECTED") throw new ApplicationAlreadyDecidedError();
    if (application.currentStatus !== "UNDER_REVIEW") throw new InvalidFormApplicationTransitionError(application.currentStatus, input.status);
    const reason = input.reason?.trim() || null;
    if (reason && reason.length > APPLICATION_DECISION_REASON_MAX_LENGTH) throw new Error("Decision reason is too long");
    if (!isValidFormApplicationTransition(application.currentStatus, input.status)) throw new InvalidFormApplicationTransitionError(application.currentStatus, input.status);
    const updated = await this.deps.applicationRepository.transitionStatus({ applicationId: input.applicationId, fromStatus: application.currentStatus, toStatus: input.status, changedByUserId: input.actor.userId, decisionReason: reason, note: reason });
    await this.deps.auditRecorder.record({ actorUserId: input.actor.userId, action: AUDIT_ACTIONS.FORM_APPLICATION_DECIDED, targetEntityType: "FormApplication", targetEntityId: input.applicationId, metadata: { status: input.status } });
    await this.deps.notificationService.notify({ recipientUserId: application.applicantUserId, template: "FORM_APPLICATION_DECIDED", context: { applicationId: input.applicationId, formTitle: application.formTitle, status: input.status, decisionReason: reason } });
    return updated;
  }
}
