import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type {
  EventAttachmentRecord,
  EventChecklistItemRecord,
  EventParticipantRecord,
  EventRecord,
  EventRegistrationRecord,
} from "../../domain/entities";
import { canManageEvent, canViewEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventParticipantRepository } from "../ports/event-participant-repository";
import type { EventChecklistRepository } from "../ports/event-checklist-repository";
import type { EventAttachmentRepository } from "../ports/event-attachment-repository";
import type { EventRegistrationRepository } from "../ports/event-registration-repository";

export interface GetEventInput {
  actor: AuthenticatedActor;
  eventId: string;
}

export interface EventDetail {
  event: EventRecord;
  participants: EventParticipantRecord[];
  checklist: EventChecklistItemRecord[];
  attachments: EventAttachmentRecord[];
  registrationCount: number;
  isSelfRegistered: boolean;
  /**
   * The full registrant roster — populated only for whoever manages this
   * event (same canManageEvent gate as every write action on it), empty
   * otherwise. A self-registered Student still gets registrationCount/
   * isSelfRegistered above; the roster of OTHER registrants' identities is
   * only exposed to management, not to every attendee, since nothing in
   * §4.2 asks for a public attendee list and this keeps the response's own
   * information disclosure surface minimal.
   */
  registrations: EventRegistrationRecord[];
}

export class GetEventUseCase {
  constructor(
    private readonly deps: {
      eventRepository: EventRepository;
      eventParticipantRepository: EventParticipantRepository;
      eventChecklistRepository: EventChecklistRepository;
      eventAttachmentRepository: EventAttachmentRepository;
      eventRegistrationRepository: EventRegistrationRepository;
    },
  ) {}

  async execute(input: GetEventInput): Promise<EventDetail> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canViewEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to view this event");
    }

    const isManager = canManageEvent(input.actor, event);

    const [participants, checklist, attachments, registrationCount, selfRegistration, registrations] = await Promise.all([
      this.deps.eventParticipantRepository.listForEvent(event.id),
      this.deps.eventChecklistRepository.listForEvent(event.id),
      this.deps.eventAttachmentRepository.listForEvent(event.id),
      this.deps.eventRegistrationRepository.countForEvent(event.id),
      this.deps.eventRegistrationRepository.findByEventAndUser(event.id, input.actor.userId),
      isManager ? this.deps.eventRegistrationRepository.listForEvent(event.id) : Promise.resolve([]),
    ]);

    return {
      event,
      participants,
      checklist,
      attachments,
      registrationCount,
      isSelfRegistered: selfRegistration !== null,
      registrations,
    };
  }
}
