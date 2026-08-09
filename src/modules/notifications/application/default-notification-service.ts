import type { JobDispatcher } from "@/modules/jobs";
import type { NotificationRequest } from "../domain/entities";
import { SEND_NOTIFICATION_JOB_TYPE } from "../domain/entities";
import type { NotificationService } from "./notification-service";
import type { NotificationRepository } from "./ports/notification-repository";
import { NOTIFICATION_CHANNELS } from "./templates/registry";

/**
 * The orchestrator behind the NotificationService abstraction. As of the
 * Background Job Processing System, this class does no delivery work
 * itself — it records the audit-trail `Notification` row (status PENDING)
 * and enqueues a SEND_NOTIFICATION job via JobDispatcher; actual recipient
 * lookup, template rendering, and email sending happen later, inside
 * NotificationJobHandler, run by a JobWorker (possibly in a different
 * process). Business use cases (e.g. ApproveDraftUseCase) are completely
 * unaffected by this change — `notify()`'s signature and "never rejects"
 * guarantee are identical to before the refactor.
 *
 * NFR-AVAIL-03 ("a degraded external dependency fails gracefully rather than
 * breaking the action it was supposed to notify about"): notify() never
 * rejects. A failure creating the Notification row or dispatching the job
 * is caught, best-effort logged, and swallowed — callers can safely await
 * this without a try/catch of their own.
 *
 * V4.0 E1: each call now fans out over `NOTIFICATION_CHANNELS[template]`,
 * writing one Notification row per channel. EMAIL keeps the exact prior
 * behavior (PENDING row + job dispatch; NotificationJobHandler does the real
 * send). IN_APP has no external dependency to fail — persisting the row *is*
 * delivery — so it's marked SENT immediately, no job involved.
 */
export class DefaultNotificationService implements NotificationService {
  constructor(
    private readonly deps: {
      jobDispatcher: JobDispatcher;
      notificationRepository: NotificationRepository;
    },
  ) {}

  async notify(request: NotificationRequest): Promise<void> {
    const channels = NOTIFICATION_CHANNELS[request.template];
    for (const channel of channels) {
      try {
        const record = await this.deps.notificationRepository.create({
          recipientUserId: request.recipientUserId,
          channel,
          template: request.template,
          payload: request.context,
        });

        if (channel === "EMAIL") {
          await this.deps.jobDispatcher.dispatch(SEND_NOTIFICATION_JOB_TYPE, {
            notificationId: record.id,
            recipientUserId: request.recipientUserId,
            template: request.template,
            context: request.context,
          });
        } else {
          await this.deps.notificationRepository.markSent(record.id);
        }
      } catch (err) {
        console.error("[notifications] failed to record/dispatch notification", channel, request.template, err);
      }
    }
  }
}
