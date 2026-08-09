import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetMyPlacementActivityUseCase } from "../../../src/modules/reports/application/use-cases/get-my-placement-activity";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakePlacementReportRepository } from "../../support/fakes/fake-placement-report-repository";
import type { MyApplicationRow } from "../../../src/modules/reports/application/ports/placement-report-repository";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function row(overrides: Partial<MyApplicationRow>): MyApplicationRow {
  return {
    applicationId: "app-1",
    companyName: "Acme",
    title: "SDE Intern",
    type: "INTERNSHIP",
    currentStatus: "APPLIED",
    appliedAt: new Date("2026-01-01"),
    interviewScheduledAt: null,
    everReceivedOffer: false,
    everAccepted: false,
    ...overrides,
  };
}

describe("GetMyPlacementActivityUseCase (V4.0 E7 — PRD §4 Student Reports: 'Own data only')", () => {
  let repository: FakePlacementReportRepository;
  let useCase: GetMyPlacementActivityUseCase;

  beforeEach(() => {
    repository = new FakePlacementReportRepository();
    useCase = new GetMyPlacementActivityUseCase({ repository });
  });

  it("returns only the acting student's own applications", async () => {
    repository.myApplications = { s1: [row({ applicationId: "a1" })], s2: [row({ applicationId: "a2" })] };
    const report = await useCase.execute(student);
    expect(report.applications.map((a) => a.applicationId)).toEqual(["a1"]);

    const call = repository.calls[0]!;
    expect(call.args[0]).toBe("s1");
  });

  it("never leaks another student's applications regardless of who calls it", async () => {
    repository.myApplications = { s1: [row({ applicationId: "a1" })], s2: [row({ applicationId: "a2" })] };
    const report = await useCase.execute(otherStudent);
    expect(report.applications.map((a) => a.applicationId)).toEqual(["a2"]);
  });

  it("counts interviewsScheduled from the direct interviewScheduledAt field, not currentStatus", async () => {
    repository.myApplications = {
      s1: [
        row({ applicationId: "a1", currentStatus: "SHORTLISTED", interviewScheduledAt: new Date() }),
        row({ applicationId: "a2", currentStatus: "INTERVIEW", interviewScheduledAt: null }),
      ],
    };
    const report = await useCase.execute(student);
    expect(report.interviewsScheduled).toBe(1);
  });

  it("counts offersReceived/placed from the event-log-derived 'ever' flags, not currentStatus — so a later rejection doesn't erase an earlier offer", async () => {
    repository.myApplications = {
      s1: [row({ applicationId: "a1", currentStatus: "REJECTED", everReceivedOffer: true, everAccepted: false })],
    };
    const report = await useCase.execute(student);
    expect(report.offersReceived).toBe(1);
    expect(report.placed).toBe(false);
  });

  it("reports placed=true if any application was ever accepted", async () => {
    repository.myApplications = { s1: [row({ everAccepted: true })] };
    const report = await useCase.execute(student);
    expect(report.placed).toBe(true);
  });

  it("returns an empty report for a student with no applications", async () => {
    const report = await useCase.execute(student);
    expect(report.totalApplications).toBe(0);
    expect(report.applications).toEqual([]);
  });

  it("denies a Secretary (this is the own-data use case, not the institutional one)", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute(recruiter)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a malformed STUDENT actor with no studentProfileId", async () => {
    const malformed: AuthenticatedActor = { userId: "stu-3", role: "STUDENT" };
    await expect(useCase.execute(malformed)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
