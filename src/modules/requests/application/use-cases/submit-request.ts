import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { RequestPriority, RequestRecord } from "../../domain/entities";
import { canSubmitRequest } from "../../domain/permissions";
import type { RequestRepository } from "../ports/request-repository";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface SubmitRequestInput {
  actor: AuthenticatedActor;
  type: string;
  description: string;
  priority?: RequestPriority;
}

export interface SubmitRequestUseCaseDeps {
  requestRepository: RequestRepository;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

/** §3.7 — the requester's entry point. No linked Task yet — created only once AssignRequestUseCase gives it an owner. */
export class SubmitRequestUseCase {
  constructor(private readonly deps: SubmitRequestUseCaseDeps) {}

  async execute(input: SubmitRequestInput): Promise<RequestRecord> {
    if (!canSubmitRequest(input.actor)) {
      throw new NotAuthorizedError("Not authorized to submit a request");
    }

    const request = await this.deps.requestRepository.create({
      type: input.type.trim(),
      description: input.description.trim(),
      priority: input.priority,
      requesterId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_SUBMITTED,
      targetEntityType: "Request",
      targetEntityId: request.id,
      metadata: { type: request.type },
    });

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "REQUEST_SUBMITTED",
          context: { requestId: request.id, type: request.type },
        }),
      ),
    );

    return request;
  }
}
