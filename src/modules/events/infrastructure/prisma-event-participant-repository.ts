import type { PrismaClient } from "@prisma/client";
import type { EventParticipantRecord, EventParticipantRole } from "../domain/entities";
import type { EventParticipantRepository } from "../application/ports/event-participant-repository";

export class PrismaEventParticipantRepository implements EventParticipantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(eventId: string, userId: string, role: EventParticipantRole): Promise<EventParticipantRecord> {
    return this.prisma.eventParticipant.create({ data: { eventId, userId, role } });
  }

  async remove(eventId: string, userId: string): Promise<void> {
    await this.prisma.eventParticipant.deleteMany({ where: { eventId, userId } });
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<EventParticipantRecord | null> {
    return this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId } } });
  }

  async listForEvent(eventId: string): Promise<EventParticipantRecord[]> {
    return this.prisma.eventParticipant.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } });
  }
}
