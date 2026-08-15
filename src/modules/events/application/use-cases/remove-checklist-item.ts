import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventChecklistRepository } from "../ports/event-checklist-repository";

export interface RemoveEventChecklistItemInput {
  actor: AuthenticatedActor;
  eventId: string;
  itemId: string;
}

export class RemoveEventChecklistItemUseCase {
  constructor(
    private readonly deps: { eventRepository: EventRepository; eventChecklistRepository: EventChecklistRepository },
  ) {}

  async execute(input: RemoveEventChecklistItemInput): Promise<void> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to manage this event's checklist");
    }

    await this.deps.eventChecklistRepository.remove(input.itemId);
  }
}
