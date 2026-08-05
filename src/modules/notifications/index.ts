/**
 * Public exports of the notifications module. Other modules must import
 * only from here — never reach into notifications/domain,
 * notifications/application, or notifications/infrastructure directly
 * (docs/architecture/07_Repository_Structure.md).
 */

export type { NotificationTemplateId, NotificationRequest } from "./domain/entities";
export type { NotificationService } from "./application/notification-service";

// Bound, ready-to-use singleton — the same pattern as auth's `withAuth`.
export { notificationService } from "./infrastructure/container";

// Called explicitly by scripts/run-worker.ts to register this module's
// SEND_NOTIFICATION handler into the shared job registry. Never invoked as
// a side effect of importing this module.
export { registerJobHandlers } from "./infrastructure/container";
