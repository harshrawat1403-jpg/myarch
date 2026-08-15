import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventChecklistItemRecord } from "../../domain/entities";
import type { EventRepository } from "../ports/event-repository";
import type { EventChecklistRepository } from "../ports/event-checklist-repository";

export interface ToggleEventChecklistItemInput {
  actor: AuthenticatedActor;
  eventId: string;
  itemId: string;
  isDone: boolean;
}

export class ToggleEventChecklistItemUseCase {
  constructor(
    private readonly deps: { eventRepository: EventRepository; eventChecklistRepository: EventChecklistRepository },
  ) {}

  async execute(input: ToggleEventChecklistItemInput): Promise<EventChecklistItemRecord> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to manage this event's checklist");
    }

    return this.deps.eventChecklistRepository.setDone(input.itemId, input.isDone);
  }
}
