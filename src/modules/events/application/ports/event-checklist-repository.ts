import type { EventChecklistItemRecord } from "../../domain/entities";

export interface EventChecklistRepository {
  add(eventId: string, label: string, sortOrder: number): Promise<EventChecklistItemRecord>;
  setDone(itemId: string, isDone: boolean): Promise<EventChecklistItemRecord>;
  remove(itemId: string): Promise<void>;
  findById(itemId: string): Promise<EventChecklistItemRecord | null>;
  listForEvent(eventId: string): Promise<EventChecklistItemRecord[]>;
}
