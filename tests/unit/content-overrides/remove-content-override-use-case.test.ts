import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/save-content-override";
import { RemoveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/remove-content-override";
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
    getUseCase: new GetPageContentOverridesUseCase({ contentOverrideRepository }),
  };
}

describe("RemoveContentOverrideUseCase — 'Reset to original' for ONE field, distinct from Discard", () => {
  it("a field that was only ever a pending draft (never published) is deleted outright — nothing to stage", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Pending" });

    await ctx.removeUseCase.execute(SECRETARY, "about", "hero.title");

    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toBeUndefined();
  });

  it("a field with a published value stages the reset as a pending draft — the live site is unaffected until Publish", async () => {
    const ctx = buildContext();
    ctx.contentOverrideRepository.seedPublished("about", "hero.title", { type: "TEXT", textValue: "Live Title" });

    await ctx.removeUseCase.execute(SECRETARY, "about", "hero.title");

    const published = await ctx.getUseCase.execute("about");
    expect(published["hero.title"]!.textValue).toBe("Live Title");

    const draft = await ctx.contentOverrideRepository.findDraftByPage("about");
    expect(draft["hero.title"]).toEqual({ type: "TEXT", textValue: null, fileId: null });
  });

  it("records an audit entry", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "x" });
    await ctx.removeUseCase.execute(SECRETARY, "about", "hero.title");

    const removalEntry = ctx.auditRecorder.entries.find((e) => e.action === "CONTENT_OVERRIDE_REMOVED");
    expect(removalEntry?.metadata).toEqual({ page: "about", contentKey: "hero.title", staged: true });
  });

  it("removing a non-existent override is a no-op, not an error", async () => {
    const ctx = buildContext();
    await expect(ctx.removeUseCase.execute(SECRETARY, "about", "never-saved")).resolves.toBeUndefined();
  });

  it("rejects a Coordinator", async () => {
    const ctx = buildContext();
    await expect(ctx.removeUseCase.execute(COORDINATOR, "about", "hero.title")).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
