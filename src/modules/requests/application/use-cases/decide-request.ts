import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { RequestDecision, RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { InvalidRequestTransitionError, RequestAlreadyDecidedError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";

export interface DecideRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  decision: RequestDecision;
  decisionReason?: string;
}

/**
 * §3.7 — "approval/rejection." Only valid from REVIEW. APPROVED leaves the
 * request in REVIEW (a decision alone doesn't pick an owner — see
 * AssignRequestUseCase, the separate action that actually moves it to
 * ASSIGNED); REJECTED closes it immediately, since a rejected request needs
 * no further processing.
 */
export class DecideRequestUseCase {
  constructor(
    private readonly deps: {
      requestRepository: RequestRepository;
      notificationService: NotificationService;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: DecideRequestInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to decide this request");
    }
    if (existing.status !== "REVIEW") {
      throw new InvalidRequestTransitionError(existing.status, "REVIEW");
    }
    if (existing.decision) throw new RequestAlreadyDecidedError();

    const updated = await this.deps.requestRepository.decide(
      input.requestId,
      input.decision,
      input.decisionReason?.trim() ?? null,
    );

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_DECIDED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { decision: input.decision },
    });

    await this.deps.notificationService.notify({
      recipientUserId: updated.requesterId,
      template: "REQUEST_DECIDED",
      context: { requestId: updated.id, type: updated.type, decision: input.decision, decisionReason: input.decisionReason },
    });

    return updated;
  }
}
