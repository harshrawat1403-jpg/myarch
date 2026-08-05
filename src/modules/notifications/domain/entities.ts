/**
 * The full catalog of notification templates Version 1.0 knows how to
 * render. Adding a template is additive (a new id + a new definition file);
 * it never requires changing a calling use case's code, only the string it
 * passes here.
 */
export type NotificationTemplateId = "PROFILE_APPROVED" | "PROFILE_CHANGES_REQUESTED";

/**
 * The one thing a business use case knows about a notification: who should
 * receive it, which template to render, and the data the template needs.
 * Deliberately silent on delivery mechanism — no channel, no email address,
 * no formatting. That is the whole point of this abstraction (see
 * docs/CHANGELOG.md, "Notification Architecture"): a use case that wants to
 * tell a student their profile was approved calls
 * `notificationService.notify({ recipientUserId, template: "PROFILE_APPROVED", context })`
 * and never learns whether that became an email, a WhatsApp message, or an
 * in-app banner.
 */
export interface NotificationRequest {
  readonly recipientUserId: string;
  readonly template: NotificationTemplateId;
  readonly context: Record<string, unknown>;
}

/**
 * Mirrors prisma/schema.prisma's NotificationChannel enum (currently EMAIL
 * only). Kept as a project-owned type rather than importing the Prisma enum
 * directly so the domain layer stays framework-free.
 */
export type NotificationChannel = "EMAIL";

/**
 * The job type this module registers with the Background Job Processing
 * System (src/modules/jobs) and dispatches under. Owned here, not in the
 * jobs module — see jobs/domain/entities.ts's JobType doc comment for why.
 */
export const SEND_NOTIFICATION_JOB_TYPE = "SEND_NOTIFICATION";

/** The payload shape enqueued for a SEND_NOTIFICATION job. */
export interface SendNotificationJobPayload {
  readonly notificationId: string;
  readonly recipientUserId: string;
  readonly template: NotificationTemplateId;
  readonly context: Record<string, unknown>;
}
