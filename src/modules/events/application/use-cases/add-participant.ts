import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventParticipantRecord, EventParticipantRole } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { DuplicateEventParticipantError, EventNotFoundError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventParticipantRepository } from "../ports/event-participant-repository";

export interface AddEventParticipantInput {
  actor: AuthenticatedActor;
  eventId: string;
  userId: string;
  role: EventParticipantRole;
}

/** §4.2 — "Coordinators, volunteers." Organizer/manager assembles their team; the ORGANIZER role itself is implicit (Event.organizerId), so a participant row is only ever added for a COORDINATOR or VOLUNTEER helping run it. */
export class AddEventParticipantUseCase {
  constructor(
    private readonly deps: {
      eventRepository: EventRepository;
      eventParticipantRepository: EventParticipantRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: AddEventParticipantInput): Promise<EventParticipantRecord> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to manage this event's participants");
    }

    const existing = await this.deps.eventParticipantRepository.findByEventAndUser(input.eventId, input.userId);
    if (existing) throw new DuplicateEventParticipantError();

    const participant = await this.deps.eventParticipantRepository.add(input.eventId, input.userId, input.role);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_PARTICIPANT_ADDED,
      targetEntityType: "Event",
      targetEntityId: input.eventId,
      metadata: { userId: input.userId, role: input.role },
    });

    return participant;
  }
}
