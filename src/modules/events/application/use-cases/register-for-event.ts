import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRegistrationRecord } from "../../domain/entities";
import { canRegisterForEvent } from "../../domain/permissions";
import { isEventRegistrationOpen } from "../../domain/entities";
import { AlreadyRegisteredForEventError, EventNotFoundError, EventNotRegistrableError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventRegistrationRepository } from "../ports/event-registration-repository";

export interface RegisterForEventInput {
  actor: AuthenticatedActor;
  eventId: string;
}

/** §4.2 — self-registration, always for the acting user (never on someone else's behalf — that would need staff-side attendance marking instead, see mark-attendance.ts). */
export class RegisterForEventUseCase {
  constructor(
    private readonly deps: {
      eventRepository: EventRepository;
      eventRegistrationRepository: EventRegistrationRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: RegisterForEventInput): Promise<EventRegistrationRecord> {
    if (!canRegisterForEvent(input.actor)) {
      throw new NotAuthorizedError("Not authorized to register for events");
    }

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!isEventRegistrationOpen(event.status)) throw new EventNotRegistrableError();

    const existing = await this.deps.eventRegistrationRepository.findByEventAndUser(input.eventId, input.actor.userId);
    if (existing) throw new AlreadyRegisteredForEventError();

    const registration = await this.deps.eventRegistrationRepository.register(input.eventId, input.actor.userId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_REGISTRATION_CREATED,
      targetEntityType: "Event",
      targetEntityId: input.eventId,
    });

    return registration;
  }
}
