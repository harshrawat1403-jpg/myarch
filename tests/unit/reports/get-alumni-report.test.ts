import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetAlumniReportUseCase } from "../../../src/modules/reports/application/use-cases/get-alumni-report";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakeAlumniReportRepository } from "../../support/fakes/fake-alumni-report-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GetAlumniReportUseCase (V4.0 E7 — PRD §16, mirrors canManageAlumni)", () => {
  let repository: FakeAlumniReportRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: GetAlumniReportUseCase;

  beforeEach(() => {
    repository = new FakeAlumniReportRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new GetAlumniReportUseCase({ repository, auditRecorder });
  });

  it("allows a Secretary", async () => {
    repository.result = { totalAlumni: 5, mentorshipAvailableCount: 2, byGraduationYear: [{ graduationYear: 2024, count: 5 }] };
    const report = await useCase.execute({ actor: secretary, filters: {} });
    expect(report.totalAlumni).toBe(5);
  });

  it("allows a Coordinator, identical unscoped access to Secretary (no batch dimension for alumni)", async () => {
    const report = await useCase.execute({ actor: coordinator, filters: {} });
    expect(report).toBeDefined();
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("passes filters through to the repository unchanged", async () => {
    const filters = { graduationYearFrom: 2020, graduationYearTo: 2025, mentorshipAvailableOnly: true };
    await useCase.execute({ actor: secretary, filters });
    expect(repository.calls[0]).toEqual(filters);
  });

  it("records a REPORT_GENERATED audit entry, targeted at the actor's own userId (targetEntityId is a strict UUID column)", async () => {
    await useCase.execute({ actor: secretary, filters: {} });
    expect(auditRecorder.entries[0]).toMatchObject({ action: "REPORT_GENERATED", targetEntityId: secretary.userId, metadata: { report: "alumni" } });
  });

  it("returns real zero counts for an empty dataset", async () => {
    const report = await useCase.execute({ actor: secretary, filters: {} });
    expect(report.totalAlumni).toBe(0);
    expect(report.byGraduationYear).toEqual([]);
  });
});
