import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRecord } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { isValidEventTransition } from "../../domain/lifecycle";
import { EventNotFoundError, InvalidEventTransitionError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";

export interface CancelEventInput {
  actor: AuthenticatedActor;
  eventId: string;
}

export class CancelEventUseCase {
  constructor(private readonly deps: { eventRepository: EventRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CancelEventInput): Promise<EventRecord> {
    const existing = await this.deps.eventRepository.findById(input.eventId);
    if (!existing) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to cancel this event");
    }
    if (!isValidEventTransition(existing.status, "CANCELLED")) {
      throw new InvalidEventTransitionError(existing.status, "CANCELLED");
    }

    const updated = await this.deps.eventRepository.setStatus(input.eventId, "CANCELLED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_CANCELLED,
      targetEntityType: "Event",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
