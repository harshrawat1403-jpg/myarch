import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRecord } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { isValidEventTransition } from "../../domain/lifecycle";
import { EventNotFoundError, InvalidEventTransitionError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";

export interface PublishEventInput {
  actor: AuthenticatedActor;
  eventId: string;
}

/** §4.2 — the moment an event becomes visible/registrable beyond its organizer and staff (see domain/permissions.ts's canViewEvent, domain/entities.ts's isEventRegistrationOpen). */
export class PublishEventUseCase {
  constructor(private readonly deps: { eventRepository: EventRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: PublishEventInput): Promise<EventRecord> {
    const existing = await this.deps.eventRepository.findById(input.eventId);
    if (!existing) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to publish this event");
    }
    if (!isValidEventTransition(existing.status, "PUBLISHED")) {
      throw new InvalidEventTransitionError(existing.status, "PUBLISHED");
    }

    const updated = await this.deps.eventRepository.setStatus(input.eventId, "PUBLISHED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_PUBLISHED,
      targetEntityType: "Event",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
