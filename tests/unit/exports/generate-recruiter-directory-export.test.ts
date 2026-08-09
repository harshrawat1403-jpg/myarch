import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GenerateRecruiterDirectoryExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-recruiter-directory-export";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryExportRepository } from "../../support/fakes/in-memory-export-repositories";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GenerateRecruiterDirectoryExportUseCase — Secretary-only (no batch dimension to scope by)", () => {
  let repo: InMemoryRecruiterDirectoryExportRepository;
  let useCase: GenerateRecruiterDirectoryExportUseCase;

  beforeEach(() => {
    repo = new InMemoryRecruiterDirectoryExportRepository();
    useCase = new GenerateRecruiterDirectoryExportUseCase({ repository: repo });

    repo.seed({
      company: "Studio Example",
      contactPerson: "Jordan Recruiter",
      officialEmail: "jordan@studio-example.com",
      activeDrives: 2,
    });
  });

  it("allows the Secretary", async () => {
    const rows = await useCase.execute({ actor: secretary });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.company).toBe("Studio Example");
  });

  it("denies a Coordinator — 'batch-scoped exports only' means this export (no batch dimension) is out of reach", async () => {
    await expect(useCase.execute({ actor: coordinator })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("passes through the repository's computed activeDrives count unchanged (V4.0 E7 — real aggregation lives in PrismaRecruiterDirectoryExportRepository)", async () => {
    const rows = await useCase.execute({ actor: secretary });
    expect(rows[0]!.activeDrives).toBe(2);
  });

  it("handles an empty dataset without error", async () => {
    const emptyRepo = new InMemoryRecruiterDirectoryExportRepository();
    const emptyUseCase = new GenerateRecruiterDirectoryExportUseCase({ repository: emptyRepo });
    await expect(emptyUseCase.execute({ actor: secretary })).resolves.toEqual([]);
  });
});
