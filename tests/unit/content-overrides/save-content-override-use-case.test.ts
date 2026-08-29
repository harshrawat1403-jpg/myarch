import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { InvalidContentOverrideError } from "../../../src/modules/content-overrides";
import { SaveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/save-content-override";
import { InMemoryContentOverrideRepository } from "../../support/fakes/in-memory-content-override-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "co-1", role: "COORDINATOR" };

function buildContext() {
  const contentOverrideRepository = new InMemoryContentOverrideRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new SaveContentOverrideUseCase({ contentOverrideRepository, auditRecorder });
  return { useCase, contentOverrideRepository, auditRecorder };
}

describe("SaveContentOverrideUseCase — stages a DRAFT, never touches the published/live value", () => {
  it("saves a TEXT override into the draft columns and records an audit entry", async () => {
    const ctx = buildContext();
    const saved = await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "New Title" });

    expect(saved.draftTextValue).toBe("New Title");
    expect(saved.textValue).toBeNull();
    expect(saved.hasDraftChange).toBe(true);
    expect(saved.type).toBe("TEXT");
    expect(ctx.auditRecorder.entries).toHaveLength(1);
    expect(ctx.auditRecorder.entries[0]!.action).toBe("CONTENT_OVERRIDE_UPDATED");
    expect(ctx.auditRecorder.entries[0]!.metadata).toEqual({ page: "about", contentKey: "hero.title", staged: true });
  });

  it("does not appear in the published read path — the public/normal page render never sees a draft", async () => {
    const ctx = buildContext();
    await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "New Title" });

    const published = await ctx.contentOverrideRepository.findByPage("about");
    expect(published["hero.title"]).toBeUndefined();

    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toEqual({ type: "TEXT", textValue: "New Title", fileId: null });
  });

  it("saves an IMAGE override", async () => {
    const ctx = buildContext();
    const saved = await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.image", type: "IMAGE", fileId: "550e8400-e29b-41d4-a716-446655440000" });

    expect(saved.draftFileId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(saved.fileId).toBeNull();
    expect(saved.type).toBe("IMAGE");
  });

  it("upserts — saving the same (page, contentKey) twice updates the same draft, not a new row", async () => {
    const ctx = buildContext();
    await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "First" });
    const second = await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Second" });

    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(Object.keys(draft)).toHaveLength(1);
    expect(draft["hero.title"]!.textValue).toBe("Second");
    expect(second.draftTextValue).toBe("Second");
  });

  it("saving a new draft over an already-published value leaves the published value untouched", async () => {
    const ctx = buildContext();
    ctx.contentOverrideRepository.seedPublished("about", "hero.title", { type: "TEXT", textValue: "Live Title" });

    const saved = await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Pending Title" });

    expect(saved.textValue).toBe("Live Title");
    expect(saved.draftTextValue).toBe("Pending Title");
    const published = await ctx.contentOverrideRepository.findByPage("about");
    expect(published["hero.title"]!.textValue).toBe("Live Title");
  });

  it("trims whitespace from text values", async () => {
    const ctx = buildContext();
    const saved = await ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "  Padded  " });
    expect(saved.draftTextValue).toBe("Padded");
  });

  it("rejects empty text", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "   " }),
    ).rejects.toBeInstanceOf(InvalidContentOverrideError);
  });

  it("rejects oversized text", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "x".repeat(5001) }),
    ).rejects.toBeInstanceOf(InvalidContentOverrideError);
  });

  it("rejects a Coordinator — Edit Mode is SECRETARY-only", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Nope" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
