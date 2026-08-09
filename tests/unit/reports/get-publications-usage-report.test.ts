import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetPublicationsUsageReportUseCase } from "../../../src/modules/reports/application/use-cases/get-publications-usage-report";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakePublicationsReportRepository } from "../../support/fakes/fake-publications-report-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GetPublicationsUsageReportUseCase (V4.0 E7 — PRD §16, mirrors canManagePublications)", () => {
  let repository: FakePublicationsReportRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: GetPublicationsUsageReportUseCase;

  beforeEach(() => {
    repository = new FakePublicationsReportRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new GetPublicationsUsageReportUseCase({ repository, auditRecorder });
  });

  it("allows a Secretary", async () => {
    repository.result = { totalPublications: 4, byStatus: [{ status: "DRAFT", count: 4 }], byType: [], exportsByFormat: [], exportsByStatus: [] };
    const report = await useCase.execute({ actor: secretary, filters: {} });
    expect(report.totalPublications).toBe(4);
  });

  it("allows a Coordinator, identical unscoped access to Secretary (Publication Studio itself is full access for both — §13)", async () => {
    const report = await useCase.execute({ actor: coordinator, filters: {} });
    expect(report).toBeDefined();
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("passes a type filter through to the repository unchanged", async () => {
    await useCase.execute({ actor: secretary, filters: { type: "BROCHURE" } });
    expect(repository.calls[0]).toEqual({ type: "BROCHURE" });
  });

  it("records a REPORT_GENERATED audit entry, targeted at the actor's own userId (targetEntityId is a strict UUID column)", async () => {
    await useCase.execute({ actor: secretary, filters: {} });
    expect(auditRecorder.entries[0]).toMatchObject({ action: "REPORT_GENERATED", targetEntityId: secretary.userId, metadata: { report: "publications-usage" } });
  });

  it("returns real zero counts for an empty dataset", async () => {
    const report = await useCase.execute({ actor: secretary, filters: {} });
    expect(report.totalPublications).toBe(0);
    expect(report.byStatus).toEqual([]);
  });
});
