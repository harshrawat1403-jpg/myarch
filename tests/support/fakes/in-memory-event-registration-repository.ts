import crypto from "node:crypto";
import type { EventRegistrationRecord } from "../../../src/modules/events";
import type { EventRegistrationRepository } from "../../../src/modules/events/application/ports/event-registration-repository";

export class InMemoryEventRegistrationRepository implements EventRegistrationRepository {
  private readonly byId = new Map<string, EventRegistrationRecord>();

  async register(eventId: string, userId: string): Promise<EventRegistrationRecord> {
    const record: EventRegistrationRecord = { id: crypto.randomUUID(), eventId, userId, registeredAt: new Date(), attendedAt: null };
    this.byId.set(record.id, record);
    return record;
  }

  async markAttended(eventId: string, userId: string): Promise<EventRegistrationRecord> {
    const existing = [...this.byId.values()].find((r) => r.eventId === eventId && r.userId === userId);
    if (!existing) throw new Error("Not registered");
    const updated: EventRegistrationRecord = { ...existing, attendedAt: new Date() };
    this.byId.set(existing.id, updated);
    return updated;
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<EventRegistrationRecord | null> {
    return [...this.byId.values()].find((r) => r.eventId === eventId && r.userId === userId) ?? null;
  }

  async listForEvent(eventId: string): Promise<EventRegistrationRecord[]> {
    return [...this.byId.values()].filter((r) => r.eventId === eventId);
  }

  async countForEvent(eventId: string): Promise<number> {
    return [...this.byId.values()].filter((r) => r.eventId === eventId).length;
  }
}
