import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GeneratePublicPlacementExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-public-placement-export";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPublicPlacementExportRepository } from "../../support/fakes/in-memory-export-repositories";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GeneratePublicPlacementExportUseCase", () => {
  let repo: InMemoryPublicPlacementExportRepository;
  let useCase: GeneratePublicPlacementExportUseCase;

  beforeEach(() => {
    repo = new InMemoryPublicPlacementExportRepository();
    useCase = new GeneratePublicPlacementExportUseCase({ repository: repo });

    repo.seed({
      batchId: "batch-a",
      fullName: "Alice Architect",
      batchName: "B.Arch 2026",
      bio: "Aspiring architect",
      skills: ["Rendering"],
      software: ["Rhino"],
      certifications: ["LEED Green Associate"],
      internshipExperience: ["Studio X"],
      portfolioLinks: ["https://alice.design"],
      resumeAvailable: true,
    });
    repo.seed({
      batchId: "batch-b",
      fullName: "Bob Builder",
      batchName: "B.Arch 2025",
      bio: null,
      skills: [],
      software: [],
      certifications: [],
      internshipExperience: [],
      portfolioLinks: [],
      resumeAvailable: false,
    });
  });

  it("returns every approved student for the Secretary", async () => {
    const rows = await useCase.execute({ actor: secretary });
    expect(rows).toHaveLength(2);
  });

  it("restricts a Coordinator to their assigned batch", async () => {
    const rows = await useCase.execute({ actor: coordinatorA });
    expect(rows.map((r) => r.fullName)).toEqual(["Alice Architect"]);
  });

  it("denies a Recruiter (this is the admin export, not the recruiter portal)", async () => {
    await expect(useCase.execute({ actor: recruiter })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("only ever contains approved-public-profile-shaped fields (no draft/approval-status/private fields)", async () => {
    const rows = await useCase.execute({ actor: secretary });
    const keys = Object.keys(rows[0]!);
    for (const forbidden of ["status", "reviewComment", "reviewedByUserId", "cgpa", "internalRemarks", "phone"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("handles an empty dataset without error", async () => {
    const emptyRepo = new InMemoryPublicPlacementExportRepository();
    const emptyUseCase = new GeneratePublicPlacementExportUseCase({ repository: emptyRepo });
    await expect(emptyUseCase.execute({ actor: secretary })).resolves.toEqual([]);
  });
});
