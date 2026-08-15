import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventChecklistItemRecord } from "../../domain/entities";
import type { EventRepository } from "../ports/event-repository";
import type { EventChecklistRepository } from "../ports/event-checklist-repository";

export interface AddEventChecklistItemInput {
  actor: AuthenticatedActor;
  eventId: string;
  label: string;
}

/** §4.2's "checklist" — a lightweight todo distinct from Task Engine tasks (see domain/entities.ts's own doc comment). No audit log: a checklist item is transient prep-work bookkeeping, not a record worth an AuditLog entry (unlike every state-changing action on the Event itself). */
export class AddEventChecklistItemUseCase {
  constructor(
    private readonly deps: { eventRepository: EventRepository; eventChecklistRepository: EventChecklistRepository },
  ) {}

  async execute(input: AddEventChecklistItemInput): Promise<EventChecklistItemRecord> {
    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to manage this event's checklist");
    }

    const current = await this.deps.eventChecklistRepository.listForEvent(input.eventId);
    return this.deps.eventChecklistRepository.add(input.eventId, input.label.trim(), current.length);
  }
}
