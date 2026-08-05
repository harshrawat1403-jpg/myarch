import type { NotificationRequest, NotificationService } from "../../../src/modules/notifications";

export class FakeNotificationService implements NotificationService {
  readonly sent: NotificationRequest[] = [];

  async notify(request: NotificationRequest): Promise<void> {
    this.sent.push(request);
  }
}
