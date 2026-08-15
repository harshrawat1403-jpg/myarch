import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRegistrationRecord } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError, NotRegisteredForEventError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventRegistrationRepository } from "../ports/event-registration-repository";

export interface MarkEventAttendanceInput {
  actor: AuthenticatedActor;
  eventId: string;
  userId: string;
}

/** §4.2 — "attendance," marked by whoever manages the event, only for someone already registered (see EventRegistration's own doc comment in schema.prisma). */
export class MarkEventAttendanceUseCase {
  constructor(
    private readonly deps: {
      eventRepository: EventRepository;
      eventRegistrationRepository: EventRegistrationRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: MarkEventAttendanceInput): Promise<EventRegistrationRecord> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to mark attendance for this event");
    }

    const existing = await this.deps.eventRegistrationRepository.findByEventAndUser(input.eventId, input.userId);
    if (!existing) throw new NotRegisteredForEventError();

    const updated = await this.deps.eventRegistrationRepository.markAttended(input.eventId, input.userId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_ATTENDANCE_MARKED,
      targetEntityType: "Event",
      targetEntityId: input.eventId,
      metadata: { userId: input.userId },
    });

    return updated;
  }
}
