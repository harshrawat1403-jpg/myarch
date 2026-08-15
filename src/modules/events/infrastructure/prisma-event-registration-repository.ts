import type { PrismaClient } from "@prisma/client";
import type { EventRegistrationRecord } from "../domain/entities";
import type { EventRegistrationRepository } from "../application/ports/event-registration-repository";

export class PrismaEventRegistrationRepository implements EventRegistrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async register(eventId: string, userId: string): Promise<EventRegistrationRecord> {
    return this.prisma.eventRegistration.create({ data: { eventId, userId } });
  }

  async markAttended(eventId: string, userId: string): Promise<EventRegistrationRecord> {
    return this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId } },
      data: { attendedAt: new Date() },
    });
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<EventRegistrationRecord | null> {
    return this.prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId } } });
  }

  async listForEvent(eventId: string): Promise<EventRegistrationRecord[]> {
    return this.prisma.eventRegistration.findMany({ where: { eventId }, orderBy: { registeredAt: "asc" } });
  }

  async countForEvent(eventId: string): Promise<number> {
    return this.prisma.eventRegistration.count({ where: { eventId } });
  }
}
