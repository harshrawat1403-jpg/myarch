import { beforeEach, describe, expect, it } from "vitest";
import { SearchPublicDirectoryUseCase } from "../../../src/modules/public-directory/application/use-cases/search-public-directory";
import { GetPublicProfileUseCase } from "../../../src/modules/public-directory/application/use-cases/get-public-profile";
import { PublicProfileNotFoundError } from "../../../src/modules/public-directory/domain/errors";
import { InMemoryPublicDirectoryRepository } from "../../support/fakes/in-memory-public-directory-repository";
import type { PublicDirectoryProfile } from "../../../src/modules/public-directory";

function makeProfile(overrides: Partial<PublicDirectoryProfile> = {}): PublicDirectoryProfile {
  return {
    studentId: "student-1",
    fullName: "Alice Architect",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: "Aspiring architect",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: true,
    profilePhotoUrl: null,
    cgpa: null,
    ...overrides,
  };
}

describe("SearchPublicDirectoryUseCase", () => {
  let repo: InMemoryPublicDirectoryRepository;
  let useCase: SearchPublicDirectoryUseCase;

  beforeEach(() => {
    repo = new InMemoryPublicDirectoryRepository();
    repo.seed(makeProfile());
    repo.seed(makeProfile({ studentId: "student-2", fullName: "Bilal Khan", batchId: "batch-b", skills: ["Sketching"] }));
    useCase = new SearchPublicDirectoryUseCase({ publicDirectoryRepository: repo });
  });

  it("has no actor requirement — a plain filters object is enough", async () => {
    const results = await useCase.execute({});
    expect(results).toHaveLength(2);
  });

  it("filters by batchId", async () => {
    const results = await useCase.execute({ batchId: "batch-a" });
    expect(results.map((r) => r.studentId)).toEqual(["student-1"]);
  });

  it("filters by free-text query across name/bio/skills/software", async () => {
    const results = await useCase.execute({ query: "sketching" });
    expect(results.map((r) => r.studentId)).toEqual(["student-2"]);
  });
});

describe("GetPublicProfileUseCase", () => {
  it("returns the profile when found", async () => {
    const repo = new InMemoryPublicDirectoryRepository();
    repo.seed(makeProfile());
    const useCase = new GetPublicProfileUseCase({ publicDirectoryRepository: repo });

    await expect(useCase.execute("student-1")).resolves.toMatchObject({ fullName: "Alice Architect" });
  });

  it("throws PublicProfileNotFoundError (never a 403 — there is no auth boundary to fail) for a private/unapproved/unknown student", async () => {
    const repo = new InMemoryPublicDirectoryRepository();
    const useCase = new GetPublicProfileUseCase({ publicDirectoryRepository: repo });

    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(PublicProfileNotFoundError);
  });
});
