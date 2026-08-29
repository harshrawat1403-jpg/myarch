import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/save-content-override";
import { RemoveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/remove-content-override";
import { DiscardDraftContentOverridesUseCase } from "../../../src/modules/content-overrides/application/use-cases/discard-draft-content-overrides";
import { GetPageContentOverridesUseCase } from "../../../src/modules/content-overrides/application/use-cases/get-page-content-overrides";
import { InMemoryContentOverrideRepository } from "../../support/fakes/in-memory-content-override-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "co-1", role: "COORDINATOR" };

function buildContext() {
  const contentOverrideRepository = new InMemoryContentOverrideRepository();
  const auditRecorder = new FakeAuditRecorder();
  return {
    contentOverrideRepository,
    auditRecorder,
    saveUseCase: new SaveContentOverrideUseCase({ contentOverrideRepository, auditRecorder }),
    removeUseCase: new RemoveContentOverrideUseCase({ contentOverrideRepository, auditRecorder }),
    discardUseCase: new DiscardDraftContentOverridesUseCase({ contentOverrideRepository, auditRecorder }),
    getUseCase: new GetPageContentOverridesUseCase({ contentOverrideRepository }),
  };
}

describe("DiscardDraftContentOverridesUseCase — the toolbar's 'Discard Changes' action", () => {
  it("discarding a brand-new field's draft (never published) deletes the row entirely", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Pending" });

    const result = await ctx.discardUseCase.execute(SECRETARY);

    expect(result.discarded).toBe(1);
    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toBeUndefined();
    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]).toBeUndefined();
  });

  it("discarding an edit to an already-published field restores exactly the last published value", async () => {
    const ctx = buildContext();
    ctx.contentOverrideRepository.seedPublished("about", "hero.title", { type: "TEXT", textValue: "Live Title" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Pending Title" });

    await ctx.discardUseCase.execute(SECRETARY);

    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]!.textValue).toBe("Live Title");
    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toBeUndefined();
  });

  it("discarding a staged Reset restores the published value (the reset never took effect)", async () => {
    const ctx = buildContext();
    ctx.contentOverrideRepository.seedPublished("about", "hero.title", { type: "TEXT", textValue: "Live Title" });
    await ctx.removeUseCase.execute(SECRETARY, "about", "hero.title");

    await ctx.discardUseCase.execute(SECRETARY);

    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]!.textValue).toBe("Live Title");
  });

  it("discards pending drafts across every page in one call", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "x" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "placements", contentKey: "hero.title", type: "TEXT", textValue: "y" });

    const result = await ctx.discardUseCase.execute(SECRETARY);
    expect(result.discarded).toBe(2);
  });

  it("records a batch audit entry with the count", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "x" });
    await ctx.discardUseCase.execute(SECRETARY);

    const entry = ctx.auditRecorder.entries.find((e) => e.action === "CONTENT_OVERRIDES_DISCARDED");
    expect(entry?.metadata).toEqual({ count: 1 });
  });

  it("rejects a Coordinator", async () => {
    const ctx = buildContext();
    await expect(ctx.discardUseCase.execute(COORDINATOR)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
