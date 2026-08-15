import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventParticipantRepository } from "../ports/event-participant-repository";

export interface RemoveEventParticipantInput {
  actor: AuthenticatedActor;
  eventId: string;
  userId: string;
}

export class RemoveEventParticipantUseCase {
  constructor(
    private readonly deps: {
      eventRepository: EventRepository;
      eventParticipantRepository: EventParticipantRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: RemoveEventParticipantInput): Promise<void> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to manage this event's participants");
    }

    await this.deps.eventParticipantRepository.remove(input.eventId, input.userId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_PARTICIPANT_REMOVED,
      targetEntityType: "Event",
      targetEntityId: input.eventId,
      metadata: { userId: input.userId },
    });
  }
}
