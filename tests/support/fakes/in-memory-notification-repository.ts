import type { NotificationRepository } from "../../../src/modules/notifications/application/ports/notification-repository";
import type { NotificationChannel, NotificationTemplateId } from "../../../src/modules/notifications/domain/entities";

export interface RecordedNotification {
  id: string;
  recipientUserId: string;
  channel: NotificationChannel;
  template: NotificationTemplateId;
  payload: Record<string, unknown>;
  status: "PENDING" | "SENT" | "FAILED";
  failureReason?: string;
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
    this.records.push({ ...entry, id, status: "PENDING" });
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
}
