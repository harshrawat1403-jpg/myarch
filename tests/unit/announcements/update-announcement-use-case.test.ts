import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { AnnouncementNotFoundError, type AnnouncementRecord } from "../../../src/modules/announcements";
import { UpdateAnnouncementUseCase } from "../../../src/modules/announcements/application/use-cases/update-announcement";
import { InMemoryAnnouncementRepository } from "../../support/fakes/in-memory-announcement-repository";
import { InMemoryAnnouncementRecipientRepository } from "../../support/fakes/in-memory-announcement-recipient-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const AUTHOR: AuthenticatedActor = { userId: "author-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const OUTSIDER_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] };

function record(overrides: Partial<AnnouncementRecord> = {}): AnnouncementRecord {
  const now = new Date();
  return {
    id: "ann-1",
    title: "Original title",
    content: "Original content",
    priority: "MEDIUM",
    audienceType: "EVERYONE",
    audienceValue: null,
    publishAt: new Date("2020-01-01T00:00:00Z"),
    expiresAt: null,
    authorId: "author-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: AnnouncementRecord = record()) {
  const announcementRepository = new InMemoryAnnouncementRepository();
  announcementRepository.seed(seed);
  const announcementRecipientRepository = new InMemoryAnnouncementRecipientRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new UpdateAnnouncementUseCase({ announcementRepository, announcementRecipientRepository, auditRecorder });
  return { useCase, auditRecorder };
}

describe("UpdateAnnouncementUseCase", () => {
  it("updates title, content, priority, and expiresAt for the author", async () => {
    const ctx = buildContext();
    const expiresAt = new Date("2026-12-31T00:00:00Z");
    const updated = await ctx.useCase.execute({
      actor: AUTHOR,
      announcementId: "ann-1",
      title: "Corrected title",
      content: "Corrected content",
      priority: "HIGH",
      expiresAt,
    });

    expect(updated.title).toBe("Corrected title");
    expect(updated.content).toBe("Corrected content");
    expect(updated.priority).toBe("HIGH");
    expect(updated.expiresAt?.getTime()).toBe(expiresAt.getTime());
    expect(ctx.auditRecorder.entries[0]?.action).toBe("ANNOUNCEMENT_UPDATED");
  });

  it("Secretary can update any announcement", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: SECRETARY, announcementId: "ann-1", title: "Secretary edit" });
    expect(updated.title).toBe("Secretary edit");
  });

  it("denies an unrelated Coordinator without announcements.manage", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: OUTSIDER_COORDINATOR, announcementId: "ann-1", title: "Should be rejected" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws AnnouncementNotFoundError for an unknown announcement", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, announcementId: "unknown", title: "x" }),
    ).rejects.toBeInstanceOf(AnnouncementNotFoundError);
  });
});
