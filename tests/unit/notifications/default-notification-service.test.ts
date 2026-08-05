/**
 * DefaultNotificationService no longer sends anything itself (see
 * infrastructure/notification-job-handler.ts for that) — it records the
 * Notification audit-trail row and enqueues a SEND_NOTIFICATION job via
 * JobDispatcher. NFR-AVAIL-03 still applies at this boundary: a failure
 * creating that row or dispatching the job must never reject notify(),
 * since a business use case (e.g. ApproveDraftUseCase) awaits it directly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultNotificationService } from "../../../src/modules/notifications/application/default-notification-service";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";

function buildContext() {
  const jobRepository = new InMemoryJobRepository();
  const jobDispatcher = new DefaultJobDispatcher({ jobRepository });
  const notificationRepository = new InMemoryNotificationRepository();
  const service = new DefaultNotificationService({ jobDispatcher, notificationRepository });
  return { jobRepository, notificationRepository, service };
}

describe("DefaultNotificationService", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a PENDING Notification row and enqueues a SEND_NOTIFICATION job carrying its id", async () => {
    await ctx.service.notify({
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });

    expect(ctx.notificationRepository.records).toHaveLength(1);
    const notification = ctx.notificationRepository.records[0]!;
    expect(notification.status).toBe("PENDING");
    expect(notification.channel).toBe("EMAIL");
    expect(notification.template).toBe("PROFILE_APPROVED");
    expect(notification.payload).toEqual({ studentName: "Alice Architect" });

    expect(ctx.jobRepository.jobs).toHaveLength(1);
    const job = ctx.jobRepository.jobs[0]!;
    expect(job.type).toBe("SEND_NOTIFICATION");
    expect(job.status).toBe("PENDING");
    expect(job.payload).toEqual({
      notificationId: notification.id,
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });
  });

  it("never throws when the job dispatcher fails — NFR-AVAIL-03", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenDispatcher = { dispatch: vi.fn().mockRejectedValue(new Error("queue unavailable")) };
    const service = new DefaultNotificationService({
      jobDispatcher: brokenDispatcher,
      notificationRepository: ctx.notificationRepository,
    });

    await expect(
      service.notify({ recipientUserId: "user-1", template: "PROFILE_APPROVED", context: {} }),
    ).resolves.toBeUndefined();

    consoleError.mockRestore();
  });

  it("never throws when creating the Notification row itself fails — NFR-AVAIL-03", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenRepository = { create: vi.fn().mockRejectedValue(new Error("db down")), markSent: vi.fn(), markFailed: vi.fn() };
    const jobRepository = new InMemoryJobRepository();
    const service = new DefaultNotificationService({
      jobDispatcher: new DefaultJobDispatcher({ jobRepository }),
      notificationRepository: brokenRepository,
    });

    await expect(
      service.notify({ recipientUserId: "user-1", template: "PROFILE_APPROVED", context: {} }),
    ).resolves.toBeUndefined();
    expect(jobRepository.jobs).toHaveLength(0);

    consoleError.mockRestore();
  });

  it("dispatches the PROFILE_CHANGES_REQUESTED template with its context intact", async () => {
    await ctx.service.notify({
      recipientUserId: "user-1",
      template: "PROFILE_CHANGES_REQUESTED",
      context: { studentName: "Alice Architect", reviewComment: "Add a portfolio link" },
    });

    const job = ctx.jobRepository.jobs[0]!;
    expect(job.payload.template).toBe("PROFILE_CHANGES_REQUESTED");
    expect(job.payload.context).toEqual({ studentName: "Alice Architect", reviewComment: "Add a portfolio link" });
  });
});
