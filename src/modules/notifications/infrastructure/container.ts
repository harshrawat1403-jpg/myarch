/**
 * Composition root for the notifications module.
 *
 * `notificationService` no longer needs a lazy-getter wrapper for
 * env-derived secrets — DefaultNotificationService now depends only on
 * `jobDispatcher` (from the jobs module, no secrets) and the Prisma-backed
 * `notificationRepository` (no secrets either), so it's safe to construct
 * eagerly. The env-derived EmailProvider moved to `registerJobHandlers()`
 * below, called explicitly by the worker entrypoint (scripts/run-worker.ts)
 * — never at import time — so importing this module still never forces
 * EMAIL_PROVIDER to already be configured (the same class of bug fixed in
 * Days 2–3 for auth's env-derived secrets, now guarded by "construct lazily,
 * on first real use" rather than a cached getter, since registration itself
 * only ever needs to happen once, explicitly).
 */
import { getEnv } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { jobDispatcher, jobRegistry } from "@/modules/jobs";
import type { NotificationService } from "../application/notification-service";
import { DefaultNotificationService } from "../application/default-notification-service";
import { SEND_NOTIFICATION_JOB_TYPE } from "../domain/entities";
import { PrismaNotificationRepository } from "./prisma-notification-repository";
import { PrismaNotificationRecipientLookup } from "./prisma-notification-recipient-lookup";
import { createEmailProvider } from "./email-provider-factory";
import { NotificationJobHandler } from "./notification-job-handler";
import { ListMyNotificationsUseCase } from "../application/use-cases/list-my-notifications";
import { MarkNotificationReadUseCase } from "../application/use-cases/mark-notification-read";

// No secrets required — safe to construct eagerly.
const notificationRepository = new PrismaNotificationRepository(prisma);
const recipientLookup = new PrismaNotificationRecipientLookup(prisma);

/** Bound NotificationService — other modules import this via `@/modules/notifications`. */
export const notificationService: NotificationService = new DefaultNotificationService({
  jobDispatcher,
  notificationRepository,
});

// V4.0 E1 — the notification center's own two use cases.
export const listMyNotificationsUseCase = new ListMyNotificationsUseCase({ notificationRepository });
export const markNotificationReadUseCase = new MarkNotificationReadUseCase({ notificationRepository });

/**
 * Registers this module's SEND_NOTIFICATION handler into the shared
 * JobRegistry. Must be called once by whatever process actually runs a
 * JobWorker (scripts/run-worker.ts) — never a side effect of importing this
 * file, so a plain web request that only needs `notificationService` never
 * pays the cost of constructing an EmailProvider (which does read
 * EMAIL_PROVIDER via getEnv()). Idempotent: safe to call more than once
 * (e.g. under dev-server hot reload).
 */
export function registerJobHandlers(): void {
  if (jobRegistry.has(SEND_NOTIFICATION_JOB_TYPE)) {
    return;
  }
  jobRegistry.register(
    new NotificationJobHandler({
      recipientLookup,
      provider: createEmailProvider(getEnv()),
      repository: notificationRepository,
    }),
  );
}

// V4.0 B3: a registration-request rejection has no User account to attach a
// userId-keyed Notification to (NotificationRequest.recipientUserId is
// required, by design — see domain/entities.ts). This is the one legitimate
// exception: a direct, best-effort send straight to EmailProvider, bypassing
// the persisted Notification/Job retry machinery entirely. Not a general
// escape hatch — every other notification in this codebase has a real
// account and must keep going through `notificationService.notify()`.
// Lazily cached (not eager) for the same reason EmailProvider construction
// is deferred to registerJobHandlers() above: importing this module must
// never force EMAIL_PROVIDER env validation on a request path that doesn't
// need it.
let cachedDirectEmailProvider: ReturnType<typeof createEmailProvider> | undefined;
export async function sendDirectEmail(message: { to: string; subject: string; text: string; html: string }): Promise<void> {
  cachedDirectEmailProvider ??= createEmailProvider(getEnv());
  await cachedDirectEmailProvider.send(message);
}
