import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetPlacementFunnelReportUseCase } from "../../../src/modules/reports/application/use-cases/get-placement-funnel-report";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakePlacementReportRepository } from "../../support/fakes/fake-placement-report-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorScopedToA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorNoScope: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GetPlacementFunnelReportUseCase (V4.0 E7 — PRD §4 Reports row: Secretary Full, Coordinator Scoped)", () => {
  let repository: FakePlacementReportRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: GetPlacementFunnelReportUseCase;

  beforeEach(() => {
    repository = new FakePlacementReportRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new GetPlacementFunnelReportUseCase({ repository, auditRecorder });
  });

  it("allows a Secretary, unscoped", async () => {
    repository.funnelResult = { ...repository.funnelResult, applied: 10 };
    const report = await useCase.execute({ actor: secretary, filters: { type: "PLACEMENT" } });
    expect(report.applied).toBe(10);
    expect(report.type).toBe("PLACEMENT");

    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ batchIds: undefined });
  });

  it("allows a Coordinator, defaulting to their own batch scope when no batch filter is given", async () => {
    await useCase.execute({ actor: coordinatorScopedToA, filters: { type: "INTERNSHIP" } });
    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ batchIds: ["batch-a"] });
  });

  it("intersects a Coordinator's requested batch filter with their own scope — never lets an out-of-scope batch through", async () => {
    await useCase.execute({ actor: coordinatorScopedToA, filters: { type: "PLACEMENT", batchIds: ["batch-a", "batch-outside-scope"] } });
    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ batchIds: ["batch-a"] });
  });

  it("a Coordinator with no assigned batches gets an empty batchIds filter, never unscoped", async () => {
    await useCase.execute({ actor: coordinatorNoScope, filters: { type: "PLACEMENT" } });
    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ batchIds: [] });
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, filters: { type: "PLACEMENT" } })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter, filters: { type: "PLACEMENT" } })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("separates PLACEMENT and INTERNSHIP — the type filter is passed straight through, never mixed", async () => {
    await useCase.execute({ actor: secretary, filters: { type: "INTERNSHIP" } });
    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ type: "INTERNSHIP" });
  });

  it("passes a date range filter through unchanged", async () => {
    const dateFrom = new Date("2026-01-01");
    const dateTo = new Date("2026-06-01");
    await useCase.execute({ actor: secretary, filters: { type: "PLACEMENT", dateFrom, dateTo } });
    const call = repository.calls[0]!;
    expect(call.args[0]).toMatchObject({ dateFrom, dateTo });
  });

  it("records a REPORT_GENERATED audit entry, targeted at the actor's own userId (targetEntityId is a strict UUID column — the report type/filters live in metadata instead)", async () => {
    await useCase.execute({ actor: secretary, filters: { type: "PLACEMENT" } });
    expect(auditRecorder.entries[0]).toMatchObject({
      action: "REPORT_GENERATED",
      targetEntityId: secretary.userId,
      metadata: { report: "placement-funnel", type: "PLACEMENT" },
    });
  });

  it("returns real zero counts for an empty dataset, not an error", async () => {
    const report = await useCase.execute({ actor: secretary, filters: { type: "PLACEMENT" } });
    expect(report.applied).toBe(0);
    expect(report.companiesRecruited).toEqual([]);
    expect(report.currentStatusBreakdown).toEqual([]);
  });

  it("`placed` mirrors `reachedAccepted` exactly (PRD §11: 'Placed' = ACCEPTED)", async () => {
    repository.funnelResult = { ...repository.funnelResult, reachedAccepted: 7 };
    const report = await useCase.execute({ actor: secretary, filters: { type: "PLACEMENT" } });
    expect(report.placed).toBe(7);
    expect(report.reachedAccepted).toBe(7);
  });
});
