import type { NotificationRecipientLookup } from "../../../src/modules/notifications/application/ports/notification-recipient-lookup";

export class FakeNotificationRecipientLookup implements NotificationRecipientLookup {
  private readonly emails = new Map<string, string>();

  seed(userId: string, email: string): void {
    this.emails.set(userId, email);
  }

  async findEmailByUserId(userId: string): Promise<string | null> {
    return this.emails.get(userId) ?? null;
  }
}
