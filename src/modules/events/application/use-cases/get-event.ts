import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type {
  EventAttachmentRecord,
  EventChecklistItemRecord,
  EventParticipantRecord,
  EventRecord,
} from "../../domain/entities";
import { canViewEvent } from "../../domain/permissions";
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

    const [participants, checklist, attachments, registrationCount, selfRegistration] = await Promise.all([
      this.deps.eventParticipantRepository.listForEvent(event.id),
      this.deps.eventChecklistRepository.listForEvent(event.id),
      this.deps.eventAttachmentRepository.listForEvent(event.id),
      this.deps.eventRegistrationRepository.countForEvent(event.id),
      this.deps.eventRegistrationRepository.findByEventAndUser(event.id, input.actor.userId),
    ]);

    return {
      event,
      participants,
      checklist,
      attachments,
      registrationCount,
      isSelfRegistered: selfRegistration !== null,
    };
  }
}
