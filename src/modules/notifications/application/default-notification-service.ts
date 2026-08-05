import type { JobDispatcher } from "@/modules/jobs";
import type { NotificationRequest } from "../domain/entities";
import { SEND_NOTIFICATION_JOB_TYPE } from "../domain/entities";
import type { NotificationService } from "./notification-service";
import type { NotificationRepository } from "./ports/notification-repository";

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
 */
export class DefaultNotificationService implements NotificationService {
  constructor(
    private readonly deps: {
      jobDispatcher: JobDispatcher;
      notificationRepository: NotificationRepository;
    },
  ) {}

  async notify(request: NotificationRequest): Promise<void> {
    try {
      const record = await this.deps.notificationRepository.create({
        recipientUserId: request.recipientUserId,
        channel: "EMAIL",
        template: request.template,
        payload: request.context,
      });

      await this.deps.jobDispatcher.dispatch(SEND_NOTIFICATION_JOB_TYPE, {
        notificationId: record.id,
        recipientUserId: request.recipientUserId,
        template: request.template,
        context: request.context,
      });
    } catch (err) {
      console.error("[notifications] failed to enqueue notification job", request.template, err);
    }
  }
}
