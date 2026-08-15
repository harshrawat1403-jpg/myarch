import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRecord } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError } from "../../domain/errors";
import type { EventRepository, UpdateEventData } from "../ports/event-repository";

export interface UpdateEventInput extends UpdateEventData {
  actor: AuthenticatedActor;
  eventId: string;
}

/** Covers general field edits AND filling in `postEventReport` after the event has happened — no status gate: a manager may correct venue/description at any point, and the report is only ever meaningful once the event is COMPLETED, which the UI (not this use case) is responsible for prompting at the right time. */
export class UpdateEventUseCase {
  constructor(private readonly deps: { eventRepository: EventRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateEventInput): Promise<EventRecord> {
    const existing = await this.deps.eventRepository.findById(input.eventId);
    if (!existing) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this event");
    }

    const { actor: _actor, eventId: _eventId, ...data } = input;
    const updated = await this.deps.eventRepository.update(input.eventId, {
      ...data,
      title: data.title?.trim(),
      description: data.description !== undefined ? data.description?.trim() ?? null : undefined,
      venue: data.venue !== undefined ? data.venue?.trim() ?? null : undefined,
      budgetNotes: data.budgetNotes !== undefined ? data.budgetNotes?.trim() ?? null : undefined,
      postEventReport: data.postEventReport !== undefined ? data.postEventReport?.trim() ?? null : undefined,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_UPDATED,
      targetEntityType: "Event",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
