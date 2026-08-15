import type { EventRegistrationRecord } from "../../domain/entities";

export interface EventRegistrationRepository {
  register(eventId: string, userId: string): Promise<EventRegistrationRecord>;
  markAttended(eventId: string, userId: string): Promise<EventRegistrationRecord>;
  findByEventAndUser(eventId: string, userId: string): Promise<EventRegistrationRecord | null>;
  listForEvent(eventId: string): Promise<EventRegistrationRecord[]>;
  countForEvent(eventId: string): Promise<number>;
}
