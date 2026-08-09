import type { AuthenticatedActor } from "@/modules/auth";
import type { InAppNotificationDTO } from "../../domain/entities";
import type { NotificationRepository } from "../ports/notification-repository";
import { renderInAppTemplate } from "../templates/render";

const LIST_LIMIT = 50;

/** V4.0 E1 — GET /api/notifications, the notification center's own read query. Any authenticated role; always scoped to the caller's own notifications. */
export class ListMyNotificationsUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  async execute(actor: AuthenticatedActor): Promise<InAppNotificationDTO[]> {
    const records = await this.deps.notificationRepository.listInAppForRecipient(actor.userId, LIST_LIMIT);
    return records.map((record) => {
      const { title, message } = renderInAppTemplate(record.template, record.payload);
      return {
        id: record.id,
        title,
        message,
        isRead: record.readAt !== null,
        createdAt: record.createdAt,
      };
    });
  }
}
