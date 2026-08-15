import type { EventParticipantRecord, EventParticipantRole } from "../../domain/entities";

export interface EventParticipantRepository {
  add(eventId: string, userId: string, role: EventParticipantRole): Promise<EventParticipantRecord>;
  remove(eventId: string, userId: string): Promise<void>;
  findByEventAndUser(eventId: string, userId: string): Promise<EventParticipantRecord | null>;
  listForEvent(eventId: string): Promise<EventParticipantRecord[]>;
}
