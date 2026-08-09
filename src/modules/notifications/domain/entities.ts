/**
 * The full catalog of notification templates Version 1.0 knows how to
 * render. Adding a template is additive (a new id + a new definition file);
 * it never requires changing a calling use case's code, only the string it
 * passes here.
 */
export type NotificationTemplateId =
  | "PROFILE_APPROVED"
  | "PROFILE_CHANGES_REQUESTED"
  | "ACCOUNT_CREDENTIALS_ISSUED"
  | "INTEREST_FACILITATION_REQUIRED"
  // V4.0 E2 — wired into the registration (B), recruiter-interest (C), and
  // placement (D) use cases that never called notify() at all before this
  // milestone. DEADLINE_REMINDER, PUBLICATION_PUBLISHED, and
  // ANNOUNCEMENT_POSTED (also named in §12) are deliberately NOT added here
  // yet — see this module's CHANGELOG-style note in registry.ts for why
  // each is structurally blocked rather than simply unimplemented.
  | "REGISTRATION_SUBMITTED"
  | "REGISTRATION_REVIEWED"
  | "REGISTRATION_DECIDED"
  | "RECRUITER_INTEREST_RECEIVED"
  | "RECRUITER_INTEREST_RESPONDED"
  | "PLACEMENT_DRIVE_ANNOUNCED"
  | "APPLICATION_STATUS_CHANGED";

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
 * Mirrors prisma/schema.prisma's NotificationChannel enum. Kept as a
 * project-owned type rather than importing the Prisma enum directly so the
 * domain layer stays framework-free.
 */
export type NotificationChannel = "EMAIL" | "IN_APP";

/**
 * One persisted IN_APP notification row, as read back for the notification
 * center. `payload` is the same raw context `notify()` was called with —
 * rendering it into a title/message happens in the application layer
 * (`renderInAppTemplate`), the same "render at read time from raw context"
 * choice `renderEmailTemplate` already makes for the EMAIL channel.
 */
export interface NotificationRecord {
  readonly id: string;
  readonly template: NotificationTemplateId;
  readonly payload: Record<string, unknown>;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}

/** The notification center's actual read model — pre-rendered, ready to display. */
export interface InAppNotificationDTO {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly isRead: boolean;
  readonly createdAt: Date;
}

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
