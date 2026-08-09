import type { NotificationRepository } from "../../../src/modules/notifications/application/ports/notification-repository";
import type { NotificationChannel, NotificationRecord, NotificationTemplateId } from "../../../src/modules/notifications/domain/entities";

export interface RecordedNotification {
  id: string;
  recipientUserId: string;
  channel: NotificationChannel;
  template: NotificationTemplateId;
  payload: Record<string, unknown>;
  status: "PENDING" | "SENT" | "FAILED";
  failureReason?: string;
  createdAt: Date;
  readAt: Date | null;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly records: RecordedNotification[] = [];
  private counter = 0;

  async create(entry: {
    recipientUserId: string;
    channel: NotificationChannel;
    template: NotificationTemplateId;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const id = `notif-${++this.counter}`;
    this.records.push({ ...entry, id, status: "PENDING", createdAt: new Date(), readAt: null });
    return { id };
  }

  async markSent(id: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) record.status = "SENT";
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) {
      record.status = "FAILED";
      record.failureReason = reason;
    }
  }

  async listInAppForRecipient(recipientUserId: string, limit: number): Promise<NotificationRecord[]> {
    return this.records
      .filter((r) => r.recipientUserId === recipientUserId && r.channel === "IN_APP")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({ id: r.id, template: r.template, payload: r.payload, createdAt: r.createdAt, readAt: r.readAt }));
  }

  async markRead(id: string, recipientUserId: string): Promise<boolean> {
    const record = this.records.find((r) => r.id === id && r.recipientUserId === recipientUserId);
    if (!record) return false;
    record.readAt = new Date();
    return true;
  }
}
