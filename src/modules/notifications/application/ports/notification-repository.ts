import type { NotificationChannel, NotificationRecord, NotificationTemplateId } from "../../domain/entities";

/**
 * Persistence for the Notification table (prisma/schema.prisma, designed in
 * Day 1 anticipating exactly this need). Version 1.0 only requires this as
 * an audit trail of what was sent and whether it succeeded — create() +
 * markSent()/markFailed() is the full read/write surface needed for that.
 *
 * The schema's `status`/`sentAt` fields already carry everything a future
 * "Sent Notifications" / "Delivery Status" view would need to query; no
 * schema change is required to support that later, only new read methods on
 * this port and a UI to call them.
 */
export interface NotificationRepository {
  create(entry: {
    recipientUserId: string;
    channel: NotificationChannel;
    template: NotificationTemplateId;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }>;

  markSent(id: string): Promise<void>;

  /**
   * `reason` is intentionally not persisted — the frozen schema has no
   * column for it. It's surfaced to the caller only for local
   * logging/observability. Adding a `failureReason` column later (for a
   * future retry queue) is additive and wouldn't change this method's
   * signature.
   */
  markFailed(id: string, reason: string): Promise<void>;

  /** V4.0 E1 — the notification center's read query: this recipient's own IN_APP rows, newest first. */
  listInAppForRecipient(recipientUserId: string, limit: number): Promise<NotificationRecord[]>;

  /**
   * Scoped to `recipientUserId` so one user can never mark another's
   * notification read by guessing an id — returns false (not found/not
   * owned) rather than throwing, letting the use case decide how to map
   * that to a 404 without a separate existence check.
   */
  markRead(id: string, recipientUserId: string): Promise<boolean>;
}
