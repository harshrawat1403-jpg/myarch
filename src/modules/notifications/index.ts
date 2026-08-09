/**
 * Public exports of the notifications module. Other modules must import
 * only from here — never reach into notifications/domain,
 * notifications/application, or notifications/infrastructure directly
 * (docs/architecture/07_Repository_Structure.md).
 */

export type { NotificationTemplateId, NotificationRequest, InAppNotificationDTO } from "./domain/entities";
export type { NotificationService } from "./application/notification-service";

// V4.0 E2 — DecideRegistrationRequestUseCase renders REGISTRATION_DECIDED
// directly for its no-account-yet rejection path (the same sendDirectEmail
// exception ACCOUNT_CREDENTIALS_ISSUED already documents), so it needs the
// pure render function itself, not just the notify() abstraction.
export { renderEmailTemplate } from "./application/templates/render";

// Bound, ready-to-use singleton — the same pattern as auth's `withAuth`.
export { notificationService } from "./infrastructure/container";

// V4.0 E1 — the notification center's own two routes.
export { listNotificationsRouteHandler } from "./presentation/route-handlers/list-notifications";
export { markNotificationReadRouteHandler } from "./presentation/route-handlers/mark-notification-read";

// V4.0 B3: the one legitimate exception to "notify by userId" — see this
// function's own doc comment in infrastructure/container.ts.
export { sendDirectEmail } from "./infrastructure/container";

// Called explicitly by scripts/run-worker.ts to register this module's
// SEND_NOTIFICATION handler into the shared job registry. Never invoked as
// a side effect of importing this module.
export { registerJobHandlers } from "./infrastructure/container";
