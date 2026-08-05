import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GenerateBatchReportExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-batch-report-export";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryBatchReportExportRepository } from "../../support/fakes/in-memory-export-repositories";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GenerateBatchReportExportUseCase", () => {
  let repo: InMemoryBatchReportExportRepository;
  let useCase: GenerateBatchReportExportUseCase;

  beforeEach(() => {
    repo = new InMemoryBatchReportExportRepository();
    useCase = new GenerateBatchReportExportUseCase({ repository: repo });

    repo.seed({
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      status: "ACTIVE",
      totalStudents: 10,
      activeStudents: 9,
      archivedStudents: 1,
    });
    repo.seed({
      batchId: "batch-b",
      batchName: "B.Arch 2021",
      status: "GRADUATED",
      totalStudents: 8,
      activeStudents: 0,
      archivedStudents: 8,
    });
  });

  it("returns every batch for the Secretary", async () => {
    const rows = await useCase.execute({ actor: secretary });
    expect(rows).toHaveLength(2);
  });

  it("restricts a Coordinator to their assigned batch", async () => {
    const rows = await useCase.execute({ actor: coordinatorA });
    expect(rows.map((r) => r.batchName)).toEqual(["B.Arch 2026"]);
  });

  it("computes total/active/archived counts correctly", async () => {
    const rows = await useCase.execute({ actor: secretary });
    const row = rows.find((r) => r.batchName === "B.Arch 2026")!;
    expect(row.totalStudents).toBe(10);
    expect(row.activeStudents).toBe(9);
    expect(row.archivedStudents).toBe(1);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("handles an empty dataset without error", async () => {
    const emptyRepo = new InMemoryBatchReportExportRepository();
    const emptyUseCase = new GenerateBatchReportExportUseCase({ repository: emptyRepo });
    await expect(emptyUseCase.execute({ actor: secretary })).resolves.toEqual([]);
  });
});
