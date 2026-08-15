import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateAnnouncementUseCase } from "../../../src/modules/announcements/application/use-cases/create-announcement";
import { InMemoryAnnouncementRepository } from "../../support/fakes/in-memory-announcement-repository";
import { InMemoryAnnouncementRecipientRepository } from "../../support/fakes/in-memory-announcement-recipient-repository";
import { FakeAudienceRecipientResolver } from "../../support/fakes/fake-audience-recipient-resolver";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const announcementRepository = new InMemoryAnnouncementRepository();
  const announcementRecipientRepository = new InMemoryAnnouncementRecipientRepository();
  const audienceRecipientResolver = new FakeAudienceRecipientResolver();
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CreateAnnouncementUseCase({
    announcementRepository,
    announcementRecipientRepository,
    audienceRecipientResolver,
    notificationService,
    auditRecorder,
  });
  return { useCase, audienceRecipientResolver, notificationService, auditRecorder, announcementRecipientRepository };
}

describe("CreateAnnouncementUseCase", () => {
  it("notifies the resolved audience immediately for a publishAt <= now announcement", async () => {
    const ctx = buildContext();
    ctx.audienceRecipientResolver.seed("EVERYONE", ["u1", "u2", SECRETARY.userId]);

    const announcement = await ctx.useCase.execute({
      actor: SECRETARY,
      title: "Fest Announcement",
      content: "Join us!",
      audienceType: "EVERYONE",
    });

    expect(ctx.notificationService.sent).toHaveLength(2);
    expect(ctx.notificationService.sent.map((n) => n.recipientUserId).sort()).toEqual(["u1", "u2"]);
    expect(ctx.notificationService.sent.every((n) => n.template === "ANNOUNCEMENT_PUBLISHED")).toBe(true);
    expect(ctx.auditRecorder.entries.map((e) => e.action)).toEqual(["ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_PUBLISHED"]);
    expect(announcement.audienceType).toBe("EVERYONE");
  });

  it("does not notify anyone for a future-dated announcement", async () => {
    const ctx = buildContext();
    ctx.audienceRecipientResolver.seed("EVERYONE", ["u1", "u2"]);

    await ctx.useCase.execute({
      actor: SECRETARY,
      title: "Fest Announcement",
      content: "Join us!",
      audienceType: "EVERYONE",
      publishAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(ctx.notificationService.sent).toHaveLength(0);
    expect(ctx.auditRecorder.entries.map((e) => e.action)).toEqual(["ANNOUNCEMENT_CREATED"]);
  });

  it("persists the explicit recipient list for SELECTED_GROUP", async () => {
    const ctx = buildContext();
    const announcement = await ctx.useCase.execute({
      actor: SECRETARY,
      title: "Just for you",
      content: "Hi",
      audienceType: "SELECTED_GROUP",
      selectedRecipientUserIds: ["u1", "u2"],
    });

    expect(await ctx.announcementRecipientRepository.listUserIdsForAnnouncement(announcement.id)).toEqual(["u1", "u2"]);
  });

  it("denies a Student from creating an announcement", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: STUDENT, title: "x", content: "y", audienceType: "EVERYONE" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
