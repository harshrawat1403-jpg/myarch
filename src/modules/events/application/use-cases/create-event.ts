import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventRecord } from "../../domain/entities";
import { canCreateEvent } from "../../domain/permissions";
import type { EventRepository } from "../ports/event-repository";

export interface CreateEventInput {
  actor: AuthenticatedActor;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  venue?: string | null;
  /** Defaults to the creator — Secretary/a delegated Coordinator may organize on behalf of someone else by passing this explicitly. */
  organizerId?: string;
  budgetAmount?: string | null;
  budgetNotes?: string | null;
}

/** §4.2 — created DRAFT; only Publish makes it visible beyond the Secretary/organizer/delegated Coordinators (see domain/permissions.ts's canViewEvent). */
export class CreateEventUseCase {
  constructor(private readonly deps: { eventRepository: EventRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CreateEventInput): Promise<EventRecord> {
    if (!canCreateEvent(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create an event");
    }

    const event = await this.deps.eventRepository.create({
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      venue: input.venue?.trim() ?? null,
      organizerId: input.organizerId ?? input.actor.userId,
      budgetAmount: input.budgetAmount ?? null,
      budgetNotes: input.budgetNotes?.trim() ?? null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_CREATED,
      targetEntityType: "Event",
      targetEntityId: event.id,
      metadata: { title: event.title },
    });

    return event;
  }
}
