/**
 * End-to-end exercise of the real wiring (no fakes standing in for
 * DefaultNotificationService, JobRegistry, or JobWorker themselves — only
 * the leaf infrastructure ports are faked, same no-live-database
 * constraint as every other integration test in this project):
 *
 *   ApproveDraftUseCase-shaped caller
 *     -> DefaultNotificationService.notify()
 *     -> Notification row (PENDING) + SEND_NOTIFICATION job enqueued
 *     -> JobWorker.pollOnce() claims it
 *     -> NotificationJobHandler.handle() renders + "sends" the email
 *     -> Notification row marked SENT
 *
 * This is the integration the "Notification Integration" testing
 * requirement calls for: proving the refactor from Days-9's synchronous
 * notification send to job-queue-based dispatch actually works end to end,
 * not just that each piece works in isolation.
 */
import { describe, expect, it } from "vitest";
import { JobRegistry, JobWorker } from "../../../src/modules/jobs";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { DefaultNotificationService } from "../../../src/modules/notifications/application/default-notification-service";
import { NotificationJobHandler } from "../../../src/modules/notifications/infrastructure/notification-job-handler";
import { SEND_NOTIFICATION_JOB_TYPE } from "../../../src/modules/notifications/domain/entities";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";
import { FakeNotificationRecipientLookup } from "../../support/fakes/fake-notification-recipient-lookup";
import { FakeEmailProvider } from "../../support/fakes/fake-email-provider";
import { FakeJobLogger } from "../../support/fakes/fake-job-logger";
import { FakeJobMetricsRecorder } from "../../support/fakes/fake-job-metrics-recorder";

function buildWorld() {
  const jobRepository = new InMemoryJobRepository();
  const jobRegistry = new JobRegistry();
  const jobDispatcher = new DefaultJobDispatcher({ jobRepository });

  const notificationRepository = new InMemoryNotificationRepository();
  const recipientLookup = new FakeNotificationRecipientLookup();
  const emailProvider = new FakeEmailProvider();

  const notificationService = new DefaultNotificationService({ jobDispatcher, notificationRepository });
  jobRegistry.register(new NotificationJobHandler({ recipientLookup, provider: emailProvider, repository: notificationRepository }));

  const worker = new JobWorker(
    { jobRepository, jobRegistry, logger: new FakeJobLogger(), metrics: new FakeJobMetricsRecorder() },
    { batchSize: 5 },
  );

  return { notificationService, worker, jobRepository, notificationRepository, recipientLookup, emailProvider };
}

describe("Notification -> Job -> Worker -> Email — end to end", () => {
  it("delivers a PROFILE_APPROVED notification through the full job pipeline", async () => {
    const world = buildWorld();
    world.recipientLookup.seed("user-1", "alice@vnit.ac.in");

    await world.notificationService.notify({
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });

    // notify() only enqueues — nothing sent yet.
    expect(world.emailProvider.sent).toHaveLength(0);
    expect(world.notificationRepository.records[0]!.status).toBe("PENDING");
    expect(world.jobRepository.jobs[0]!.type).toBe(SEND_NOTIFICATION_JOB_TYPE);

    const claimed = await world.worker.pollOnce();

    expect(claimed).toBe(1);
    expect(world.emailProvider.sent).toHaveLength(1);
    expect(world.emailProvider.sent[0]!.to).toBe("alice@vnit.ac.in");
    expect(world.emailProvider.sent[0]!.text).toContain("Alice Architect");
    expect(world.notificationRepository.records[0]!.status).toBe("SENT");
    expect(world.jobRepository.jobs[0]!.status).toBe("COMPLETED");
  });

  it("retries a transient email provider failure, then succeeds and marks everything SENT/COMPLETED", async () => {
    const world = buildWorld();
    world.recipientLookup.seed("user-1", "alice@vnit.ac.in");
    world.emailProvider.shouldThrow = true;

    await world.notificationService.notify({
      recipientUserId: "user-1",
      template: "PROFILE_CHANGES_REQUESTED",
      context: { studentName: "Alice Architect", reviewComment: "Add a link" },
    });

    await world.worker.pollOnce(); // fails, scheduled for retry
    expect(world.jobRepository.jobs[0]!.status).toBe("RETRYING");
    expect(world.notificationRepository.records[0]!.status).toBe("PENDING");

    // Simulate the retry becoming due, and the provider recovering.
    world.jobRepository.jobs[0] = { ...world.jobRepository.jobs[0]!, runAt: new Date(0) };
    world.emailProvider.shouldThrow = false;

    await world.worker.pollOnce();

    expect(world.jobRepository.jobs[0]!.status).toBe("COMPLETED");
    expect(world.notificationRepository.records[0]!.status).toBe("SENT");
    expect(world.emailProvider.sent).toHaveLength(1);
  });

  it("dead-letters after exhausting retries, and the Notification row ends FAILED via onPermanentFailure", async () => {
    const world = buildWorld();
    world.recipientLookup.seed("user-1", "alice@vnit.ac.in");
    world.emailProvider.shouldThrow = true;

    await world.notificationService.notify({
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });
    // Force a low maxAttempts so the test doesn't need to simulate many retry cycles.
    world.jobRepository.jobs[0] = { ...world.jobRepository.jobs[0]!, maxAttempts: 1 };

    await world.worker.pollOnce();

    expect(world.jobRepository.jobs[0]!.status).toBe("FAILED");
    expect(world.notificationRepository.records[0]!.status).toBe("FAILED");
    expect(world.notificationRepository.records[0]!.failureReason).toBe("Simulated provider failure");
  });

  it("marks the Notification FAILED without ever calling the provider when the recipient has no email on file", async () => {
    const world = buildWorld();
    // Deliberately not seeding an email for user-1.

    await world.notificationService.notify({
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Ghost" },
    });

    await world.worker.pollOnce();

    expect(world.emailProvider.sent).toHaveLength(0);
    expect(world.notificationRepository.records[0]!.status).toBe("FAILED");
    // Handled as a permanent condition on the first attempt — the job itself completes normally
    // (handle() returns rather than throwing), it just didn't have anything to send.
    expect(world.jobRepository.jobs[0]!.status).toBe("COMPLETED");
  });
});
