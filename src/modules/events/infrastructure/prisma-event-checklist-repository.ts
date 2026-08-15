import type { PrismaClient } from "@prisma/client";
import type { EventChecklistItemRecord } from "../domain/entities";
import type { EventChecklistRepository } from "../application/ports/event-checklist-repository";

export class PrismaEventChecklistRepository implements EventChecklistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(eventId: string, label: string, sortOrder: number): Promise<EventChecklistItemRecord> {
    return this.prisma.eventChecklistItem.create({ data: { eventId, label, sortOrder } });
  }

  async setDone(itemId: string, isDone: boolean): Promise<EventChecklistItemRecord> {
    return this.prisma.eventChecklistItem.update({ where: { id: itemId }, data: { isDone } });
  }

  async remove(itemId: string): Promise<void> {
    await this.prisma.eventChecklistItem.delete({ where: { id: itemId } });
  }

  async findById(itemId: string): Promise<EventChecklistItemRecord | null> {
    return this.prisma.eventChecklistItem.findUnique({ where: { id: itemId } });
  }

  async listForEvent(eventId: string): Promise<EventChecklistItemRecord[]> {
    return this.prisma.eventChecklistItem.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } });
  }
}
