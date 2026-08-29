import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/save-content-override";
import { RemoveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/remove-content-override";
import { PublishDraftContentOverridesUseCase } from "../../../src/modules/content-overrides/application/use-cases/publish-draft-content-overrides";
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
    publishUseCase: new PublishDraftContentOverridesUseCase({ contentOverrideRepository, auditRecorder }),
    getUseCase: new GetPageContentOverridesUseCase({ contentOverrideRepository }),
  };
}

describe("PublishDraftContentOverridesUseCase — the toolbar's 'Save Changes' action", () => {
  it("copies a new field's draft into published and clears the draft", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "New Title" });

    const result = await ctx.publishUseCase.execute(SECRETARY);

    expect(result.published).toBe(1);
    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]!.textValue).toBe("New Title");
    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toBeUndefined();
  });

  it("publishing a staged Reset deletes the row entirely — the field reverts to the code default", async () => {
    const ctx = buildContext();
    ctx.contentOverrideRepository.seedPublished("about", "hero.title", { type: "TEXT", textValue: "Live Title" });
    await ctx.removeUseCase.execute(SECRETARY, "about", "hero.title");

    await ctx.publishUseCase.execute(SECRETARY);

    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]).toBeUndefined();
  });

  it("publishes pending drafts across every page in one call", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "About Title" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "placements", contentKey: "hero.title", type: "TEXT", textValue: "Placements Title" });

    const result = await ctx.publishUseCase.execute(SECRETARY);

    expect(result.published).toBe(2);
    expect((await ctx.getUseCase.execute("about"))["hero.title"]!.textValue).toBe("About Title");
    expect((await ctx.getUseCase.execute("placements"))["hero.title"]!.textValue).toBe("Placements Title");
  });

  it("does nothing and reports 0 when there are no pending drafts", async () => {
    const ctx = buildContext();
    const result = await ctx.publishUseCase.execute(SECRETARY);
    expect(result.published).toBe(0);
  });

  it("records a batch audit entry with the count", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "x" });
    await ctx.publishUseCase.execute(SECRETARY);

    const entry = ctx.auditRecorder.entries.find((e) => e.action === "CONTENT_OVERRIDES_PUBLISHED");
    expect(entry?.metadata).toEqual({ count: 1 });
  });

  it("rejects a Coordinator", async () => {
    const ctx = buildContext();
    await expect(ctx.publishUseCase.execute(COORDINATOR)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
