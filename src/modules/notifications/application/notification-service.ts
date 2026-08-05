import type { NotificationRequest } from "../domain/entities";

/**
 * The abstraction named in the architecture requirement: "Business use
 * cases should never know whether a notification is delivered by Email,
 * WhatsApp, SMS, Push Notification, or an in-app notification. Instead they
 * publish a notification request through the NotificationService
 * abstraction." Every consuming module (profiles today; others later)
 * depends only on this interface — never on DefaultNotificationService or
 * any concrete provider. Same shape as AuditRecorder in src/lib/audit.ts,
 * which this deliberately mirrors.
 */
export interface NotificationService {
  notify(request: NotificationRequest): Promise<void>;
}
