import type { JobHandler } from "@/modules/jobs";
import { SEND_NOTIFICATION_JOB_TYPE } from "../domain/entities";
import type { SendNotificationJobPayload } from "../domain/entities";
import type { EmailProvider } from "../application/ports/email-provider";
import type { NotificationRecipientLookup } from "../application/ports/notification-recipient-lookup";
import type { NotificationRepository } from "../application/ports/notification-repository";
import { renderEmailTemplate } from "../application/templates/render";

/**
 * Registered against SEND_NOTIFICATION in the shared JobRegistry (see
 * infrastructure/container.ts's registerJobHandlers()). This is where the
 * actual work DefaultNotificationService used to do inline now happens —
 * run by a JobWorker, with the worker's own retry/backoff/dead-letter
 * machinery handling transient failures.
 *
 * Deliberately does NOT catch EmailProvider failures itself: throwing lets
 * JobWorker decide whether to retry (transient failure) or dead-letter
 * (attempts exhausted) using the generic policy every job type shares.
 * Only `onPermanentFailure` — called once, after the worker gives up — marks
 * the domain-specific `Notification` row FAILED, so the notifications
 * module's own audit trail (a concern the generic Job table doesn't know
 * about) stays accurate without duplicating retry logic here.
 */
export class NotificationJobHandler implements JobHandler {
  readonly type = SEND_NOTIFICATION_JOB_TYPE;

  constructor(
    private readonly deps: {
      recipientLookup: NotificationRecipientLookup;
      provider: EmailProvider;
      repository: NotificationRepository;
    },
  ) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const payload = rawPayload as unknown as SendNotificationJobPayload;
    const email = await this.deps.recipientLookup.findEmailByUserId(payload.recipientUserId);
    if (!email) {
      // Not a transient failure — retrying can never make a missing
      // recipient appear. Mark it delivered-as-failed-as-possible now
      // rather than burning through retry attempts.
      await this.deps.repository.markFailed(payload.notificationId, "Recipient has no email on file");
      return;
    }

    const message = renderEmailTemplate(payload.template, payload.context, email);
    await this.deps.provider.send(message);
    await this.deps.repository.markSent(payload.notificationId);
  }

  async onPermanentFailure(rawPayload: Record<string, unknown>, error: Error): Promise<void> {
    const payload = rawPayload as unknown as SendNotificationJobPayload;
    await this.deps.repository.markFailed(payload.notificationId, error.message);
  }
}
