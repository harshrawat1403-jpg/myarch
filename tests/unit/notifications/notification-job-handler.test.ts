/**
 * NotificationJobHandler is where the actual recipient-lookup/render/send
 * work moved to, out of DefaultNotificationService. Key contract: it must
 * THROW on a transient EmailProvider failure (so JobWorker's generic
 * retry/backoff applies) rather than swallowing it itself, and its
 * onPermanentFailure hook is the only place the domain-specific
 * Notification row gets marked FAILED once the worker gives up.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NotificationJobHandler } from "../../../src/modules/notifications/infrastructure/notification-job-handler";
import { FakeEmailProvider } from "../../support/fakes/fake-email-provider";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";
import { FakeNotificationRecipientLookup } from "../../support/fakes/fake-notification-recipient-lookup";

function buildContext() {
  const recipientLookup = new FakeNotificationRecipientLookup();
  const provider = new FakeEmailProvider();
  const repository = new InMemoryNotificationRepository();
  const handler = new NotificationJobHandler({ recipientLookup, provider, repository });
  return { recipientLookup, provider, repository, handler };
}

describe("NotificationJobHandler.handle", () => {
  let ctx: ReturnType<typeof buildContext>;
  let notificationId: string;

  beforeEach(async () => {
    ctx = buildContext();
    ctx.recipientLookup.seed("user-1", "alice@vnit.ac.in");
    const record = await ctx.repository.create({
      recipientUserId: "user-1",
      channel: "EMAIL",
      template: "PROFILE_APPROVED",
      payload: { studentName: "Alice Architect" },
    });
    notificationId = record.id;
  });

  it("sends the rendered email and marks the Notification row SENT", async () => {
    await ctx.handler.handle({
      notificationId,
      recipientUserId: "user-1",
      template: "PROFILE_APPROVED",
      context: { studentName: "Alice Architect" },
    });

    expect(ctx.provider.sent).toHaveLength(1);
    expect(ctx.provider.sent[0]!.to).toBe("alice@vnit.ac.in");
    expect(ctx.repository.records.find((r) => r.id === notificationId)!.status).toBe("SENT");
  });

  it("marks the Notification row FAILED and does not attempt to send when the recipient has no email on file", async () => {
    await ctx.handler.handle({
      notificationId,
      recipientUserId: "unknown-user",
      template: "PROFILE_APPROVED",
      context: { studentName: "Ghost" },
    });

    expect(ctx.provider.sent).toHaveLength(0);
    const record = ctx.repository.records.find((r) => r.id === notificationId)!;
    expect(record.status).toBe("FAILED");
    expect(record.failureReason).toMatch(/no email on file/i);
  });

  it("propagates (throws) when the email provider fails, WITHOUT marking the Notification row itself", async () => {
    ctx.provider.shouldThrow = true;

    await expect(
      ctx.handler.handle({
        notificationId,
        recipientUserId: "user-1",
        template: "PROFILE_APPROVED",
        context: { studentName: "Alice Architect" },
      }),
    ).rejects.toThrow("Simulated provider failure");

    // Still PENDING — JobWorker's retry/backoff owns what happens next, not the handler.
    expect(ctx.repository.records.find((r) => r.id === notificationId)!.status).toBe("PENDING");
  });
});

describe("NotificationJobHandler.onPermanentFailure", () => {
  it("marks the Notification row FAILED with the error message once the worker has exhausted retries", async () => {
    const ctx = buildContext();
    const record = await ctx.repository.create({
      recipientUserId: "user-1",
      channel: "EMAIL",
      template: "PROFILE_APPROVED",
      payload: {},
    });

    await ctx.handler.onPermanentFailure(
      { notificationId: record.id, recipientUserId: "user-1", template: "PROFILE_APPROVED", context: {} },
      new Error("SMTP connection refused"),
    );

    const reloaded = ctx.repository.records.find((r) => r.id === record.id)!;
    expect(reloaded.status).toBe("FAILED");
    expect(reloaded.failureReason).toBe("SMTP connection refused");
  });
});
