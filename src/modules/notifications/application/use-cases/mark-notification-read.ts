import type { AuthenticatedActor } from "@/modules/auth";
import { NotificationNotFoundError } from "../../domain/errors";
import type { NotificationRepository } from "../ports/notification-repository";

/** V4.0 E1 — PATCH /api/notifications/[id]/read. Scoped to the caller's own notifications by the repository query itself, not a separate permission check. */
export class MarkNotificationReadUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  async execute(actor: AuthenticatedActor, notificationId: string): Promise<void> {
    const found = await this.deps.notificationRepository.markRead(notificationId, actor.userId);
    if (!found) throw new NotificationNotFoundError();
  }
}
