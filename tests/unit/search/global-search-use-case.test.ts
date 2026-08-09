import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GlobalSearchUseCase } from "../../../src/modules/search/application/use-cases/global-search";
import type { DriveSearchRow } from "../../../src/modules/search/application/ports/global-search-repository";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakeGlobalSearchRepository } from "../../support/fakes/fake-global-search-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorScopedToA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorNoScope: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "student-profile-1" };

function drive(overrides: Partial<DriveSearchRow>): DriveSearchRow {
  return {
    id: "drive-1",
    title: "Acme Placement Drive",
    status: "ANNOUNCED",
    companyName: "Acme Corp",
    eligibleBatchIds: [],
    applicationDeadline: null,
    ...overrides,
  };
}

describe("GlobalSearchUseCase (V4.0 E6 — PRD §15)", () => {
  let repository: FakeGlobalSearchRepository;
  let useCase: GlobalSearchUseCase;

  beforeEach(() => {
    repository = new FakeGlobalSearchRepository();
    useCase = new GlobalSearchUseCase({ repository });
  });

  it("returns empty results without querying the repository for a too-short query", async () => {
    const results = await useCase.execute(secretary, "a");
    expect(results).toEqual({ students: [], companies: [], drives: [], publications: [] });
    expect(repository.calls).toHaveLength(0);
  });

  describe("Secretary — full, unscoped access to every entity type", () => {
    it("returns Students, Companies, Drives, and Publications", async () => {
      repository.staffStudents = [{ kind: "STUDENT", id: "s1", fullName: "Priya Iyer", batchName: "2026", rollNumber: "CS001" }];
      repository.companies = [{ kind: "COMPANY", id: "c1", name: "Acme", sector: "IT" }];
      repository.drives = [drive({ id: "d1" })];
      repository.publications = [{ kind: "PUBLICATION", id: "p1", title: "Placement Brochure", status: "DRAFT" }];

      const results = await useCase.execute(secretary, "acme");

      expect(results.students).toHaveLength(1);
      expect(results.companies).toHaveLength(1);
      expect(results.drives).toHaveLength(1);
      expect(results.publications).toHaveLength(1);

      const studentsCall = repository.calls.find((c) => c.method === "searchStudentsForStaff");
      expect(studentsCall?.args[1]).toMatchObject({ batchIds: undefined });
    });
  });

  describe("Coordinator — batch-scoped Students/Drives, full Companies/Publications", () => {
    it("requests batch-scoped students and filters drives to any-overlap-with-scope", async () => {
      repository.staffStudents = [{ kind: "STUDENT", id: "s1", fullName: "Priya Iyer", batchName: "2026", rollNumber: "CS001" }];
      repository.companies = [{ kind: "COMPANY", id: "c1", name: "Acme", sector: "IT" }];
      repository.publications = [{ kind: "PUBLICATION", id: "p1", title: "Placement Brochure", status: "DRAFT" }];
      repository.drives = [
        drive({ id: "in-scope", eligibleBatchIds: ["batch-a"] }),
        drive({ id: "out-of-scope", eligibleBatchIds: ["batch-z"] }),
        drive({ id: "open-to-all", eligibleBatchIds: [] }),
      ];

      const results = await useCase.execute(coordinatorScopedToA, "acme");

      expect(results.drives.map((d) => d.id)).toEqual(["in-scope"]);
      expect(results.students).toHaveLength(1);
      expect(results.companies).toHaveLength(1);
      expect(results.publications).toHaveLength(1);

      const studentsCall = repository.calls.find((c) => c.method === "searchStudentsForStaff");
      expect(studentsCall?.args[1]).toMatchObject({ batchIds: ["batch-a"] });
    });

    it("a Coordinator with no assigned batches gets no Students/Drives but still gets Companies/Publications", async () => {
      repository.companies = [{ kind: "COMPANY", id: "c1", name: "Acme", sector: "IT" }];
      repository.publications = [{ kind: "PUBLICATION", id: "p1", title: "Placement Brochure", status: "DRAFT" }];

      const results = await useCase.execute(coordinatorNoScope, "acme");

      expect(results.students).toEqual([]);
      expect(results.drives).toEqual([]);
      expect(results.companies).toHaveLength(1);
      expect(results.publications).toHaveLength(1);
      expect(repository.calls.some((c) => c.method === "searchStudentsForStaff")).toBe(false);
      expect(repository.calls.some((c) => c.method === "searchDrives")).toBe(false);
    });
  });

  describe("Recruiter — Students only, via the privacy-safe recruiter-facing method, never rollNumber", () => {
    it("returns only Students and never touches Companies/Drives/Publications", async () => {
      repository.recruiterStudents = [{ kind: "STUDENT", id: "s1", fullName: "Priya Iyer", batchName: "2026", rollNumber: null }];

      const results = await useCase.execute(recruiter, "priya");

      expect(results.students).toEqual([{ kind: "STUDENT", id: "s1", fullName: "Priya Iyer", batchName: "2026", rollNumber: null }]);
      expect(results.companies).toEqual([]);
      expect(results.drives).toEqual([]);
      expect(results.publications).toEqual([]);
      expect(repository.calls.map((c) => c.method)).toEqual(["searchStudentsForRecruiter"]);
    });

    it("denies a Recruiter with no recruiter-directory access is unreachable here (route already gates by role) — sanity: never calls staff/publication methods", async () => {
      await useCase.execute(recruiter, "priya");
      expect(repository.calls.some((c) => c.method === "searchStudentsForStaff")).toBe(false);
      expect(repository.calls.some((c) => c.method === "searchPublications")).toBe(false);
      expect(repository.calls.some((c) => c.method === "searchCompanies")).toBe(false);
    });
  });

  describe("Student — open Drives only, mirrors ListOpenDrivesForStudentUseCase's exact eligibility rule", () => {
    beforeEach(() => {
      repository.studentBatchIds[student.studentProfileId!] = "batch-a";
    });

    it("includes ANNOUNCED/IN_PROGRESS drives eligible for the student's batch or open to all", async () => {
      repository.drives = [
        drive({ id: "eligible-specific", eligibleBatchIds: ["batch-a"], status: "ANNOUNCED" }),
        drive({ id: "open-to-all", eligibleBatchIds: [], status: "IN_PROGRESS" }),
        drive({ id: "wrong-batch", eligibleBatchIds: ["batch-z"], status: "ANNOUNCED" }),
      ];

      const results = await useCase.execute(student, "acme");
      expect(results.drives.map((d) => d.id).sort()).toEqual(["eligible-specific", "open-to-all"]);
    });

    it("excludes DRAFT/CLOSED drives even if eligible", async () => {
      repository.drives = [drive({ id: "draft", status: "DRAFT", eligibleBatchIds: [] }), drive({ id: "closed", status: "CLOSED", eligibleBatchIds: [] })];
      const results = await useCase.execute(student, "acme");
      expect(results.drives).toEqual([]);
    });

    it("excludes drives whose application deadline has passed", async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      repository.drives = [
        drive({ id: "expired", eligibleBatchIds: [], applicationDeadline: past }),
        drive({ id: "still-open", eligibleBatchIds: [], applicationDeadline: future }),
      ];
      const results = await useCase.execute(student, "acme");
      expect(results.drives.map((d) => d.id)).toEqual(["still-open"]);
    });

    it("never returns Students, Companies, or Publications", async () => {
      repository.drives = [drive({ eligibleBatchIds: [] })];
      const results = await useCase.execute(student, "acme");
      expect(results.students).toEqual([]);
      expect(results.companies).toEqual([]);
      expect(results.publications).toEqual([]);
    });

    it("returns empty results for a student with no batch record found", async () => {
      const orphanStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "unknown-profile" };
      const results = await useCase.execute(orphanStudent, "acme");
      expect(results).toEqual({ students: [], companies: [], drives: [], publications: [] });
    });

    it("throws NotAuthorizedError for a STUDENT actor missing studentProfileId", async () => {
      const malformed: AuthenticatedActor = { userId: "stu-3", role: "STUDENT" };
      await expect(useCase.execute(malformed, "acme")).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });
});
