import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GenerateStudentDirectoryExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-student-directory-export";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentDirectoryExportRepository } from "../../support/fakes/in-memory-export-repositories";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorNone: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GenerateStudentDirectoryExportUseCase", () => {
  let repo: InMemoryStudentDirectoryExportRepository;
  let useCase: GenerateStudentDirectoryExportUseCase;

  beforeEach(() => {
    repo = new InMemoryStudentDirectoryExportRepository();
    useCase = new GenerateStudentDirectoryExportUseCase({ repository: repo });

    repo.seed({
      batchId: "batch-a",
      fullName: "Alice Architect",
      rollNumber: "BA001",
      batchName: "B.Arch 2026",
      instituteEmail: "alice@vnit.ac.in",
      skills: ["Rendering"],
      software: ["Rhino"],
      resumeAvailable: true,
      portfolioAvailable: true,
      activeStatus: true,
    });
    repo.seed({
      batchId: "batch-b",
      fullName: "Bob Builder",
      rollNumber: "BA002",
      batchName: "B.Arch 2025",
      instituteEmail: "bob@vnit.ac.in",
      skills: ["Modeling"],
      software: ["AutoCAD"],
      resumeAvailable: false,
      portfolioAvailable: false,
      activeStatus: false,
    });
  });

  it("returns every student for the Secretary (all exports)", async () => {
    const rows = await useCase.execute({ actor: secretary });
    expect(rows).toHaveLength(2);
  });

  it("restricts a Coordinator to their assigned batch (batch-scoped exports only)", async () => {
    const rows = await useCase.execute({ actor: coordinatorA });
    expect(rows.map((r) => r.fullName)).toEqual(["Alice Architect"]);
  });

  it("returns an empty export for a Coordinator with no batch scope", async () => {
    const rows = await useCase.execute({ actor: coordinatorNone });
    expect(rows).toEqual([]);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("includes archived students, distinguished by the Active Status column (not excluded)", async () => {
    const rows = await useCase.execute({ actor: secretary });
    const bob = rows.find((r) => r.fullName === "Bob Builder");
    expect(bob).toBeDefined();
    expect(bob!.activeStatus).toBe(false);
  });

  it("handles an empty dataset without error", async () => {
    const emptyRepo = new InMemoryStudentDirectoryExportRepository();
    const emptyUseCase = new GenerateStudentDirectoryExportUseCase({ repository: emptyRepo });
    const rows = await emptyUseCase.execute({ actor: secretary });
    expect(rows).toEqual([]);
  });
});
