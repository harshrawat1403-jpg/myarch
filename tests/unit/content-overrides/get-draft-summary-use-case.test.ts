import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SaveContentOverrideUseCase } from "../../../src/modules/content-overrides/application/use-cases/save-content-override";
import { GetDraftSummaryUseCase } from "../../../src/modules/content-overrides/application/use-cases/get-draft-summary";
import { GetPageDraftContentOverridesUseCase } from "../../../src/modules/content-overrides/application/use-cases/get-page-draft-content-overrides";
import { InMemoryContentOverrideRepository } from "../../support/fakes/in-memory-content-override-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "co-1", role: "COORDINATOR" };

function buildContext() {
  const contentOverrideRepository = new InMemoryContentOverrideRepository();
  const auditRecorder = new FakeAuditRecorder();
  return {
    contentOverrideRepository,
    saveUseCase: new SaveContentOverrideUseCase({ contentOverrideRepository, auditRecorder }),
    summaryUseCase: new GetDraftSummaryUseCase({ contentOverrideRepository }),
    draftUseCase: new GetPageDraftContentOverridesUseCase({ contentOverrideRepository }),
  };
}

describe("GetDraftSummaryUseCase — powers the toolbar's 'Edit Mode · N changes' count", () => {
  it("returns 0/empty when nothing is pending", async () => {
    const ctx = buildContext();
    expect(await ctx.summaryUseCase.execute(SECRETARY)).toEqual({ total: 0, byPage: {} });
  });

  it("counts pending drafts globally and per page", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "a" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.subhead", type: "TEXT", textValue: "b" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "placements", contentKey: "hero.title", type: "TEXT", textValue: "c" });

    const summary = await ctx.summaryUseCase.execute(SECRETARY);
    expect(summary.total).toBe(3);
    expect(summary.byPage).toEqual({ about: 2, placements: 1 });
  });

  it("rejects a Coordinator", async () => {
    const ctx = buildContext();
    await expect(ctx.summaryUseCase.execute(COORDINATOR)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("GetPageDraftContentOverridesUseCase — SECRETARY-only preview read", () => {
  it("returns only fields with a pending draft on the requested page", async () => {
    const ctx = buildContext();
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "about", contentKey: "hero.title", type: "TEXT", textValue: "Draft Title" });
    await ctx.saveUseCase.execute({ actor: SECRETARY, page: "placements", contentKey: "hero.title", type: "TEXT", textValue: "Other Page" });

    const draft = await ctx.draftUseCase.execute(SECRETARY, "about");
    expect(draft).toEqual({ "hero.title": { type: "TEXT", textValue: "Draft Title", fileId: null } });
  });

  it("rejects a Coordinator", async () => {
    const ctx = buildContext();
    await expect(ctx.draftUseCase.execute(COORDINATOR, "about")).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
