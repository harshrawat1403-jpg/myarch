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

// No secrets required — safe to construct eagerly.
const notificationRepository = new PrismaNotificationRepository(prisma);
const recipientLookup = new PrismaNotificationRecipientLookup(prisma);

/** Bound NotificationService — other modules import this via `@/modules/notifications`. */
export const notificationService: NotificationService = new DefaultNotificationService({
  jobDispatcher,
  notificationRepository,
});

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
