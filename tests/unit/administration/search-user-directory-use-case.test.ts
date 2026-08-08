import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SearchUserDirectoryUseCase } from "../../../src/modules/administration/application/use-cases/search-user-directory";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryDirectoryRepository } from "../../support/fakes/in-memory-directory-repository";
import type { DirectoryEntry } from "../../../src/modules/administration";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_A: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function entry(overrides: Partial<DirectoryEntry>): DirectoryEntry {
  return {
    userId: "user-x",
    profileId: "profile-x",
    role: "STUDENT",
    fullName: "Someone",
    email: "someone@example.com",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("SearchUserDirectoryUseCase", () => {
  let directoryRepository: InMemoryDirectoryRepository;
  let useCase: SearchUserDirectoryUseCase;

  beforeEach(() => {
    directoryRepository = new InMemoryDirectoryRepository();
    useCase = new SearchUserDirectoryUseCase({ directoryRepository });

    directoryRepository.seed(
      entry({ userId: "u-sec", profileId: "p-sec", role: "SECRETARY", fullName: "Sam Secretary" }),
    );
    directoryRepository.seed(
      entry({ userId: "u-coord", profileId: "p-coord", role: "COORDINATOR", fullName: "Cara Coordinator" }),
    );
    directoryRepository.seed(
      entry({ userId: "u-rec", profileId: "p-rec", role: "RECRUITER", fullName: "Rita Recruiter", companyName: "Studio" }),
    );
    directoryRepository.seed(
      entry({ userId: "u-stu-a", profileId: "p-stu-a", role: "STUDENT", fullName: "Alan Student A", batchId: "batch-a" }),
    );
    directoryRepository.seed(
      entry({ userId: "u-stu-b", profileId: "p-stu-b", role: "STUDENT", fullName: "Beth Student B", batchId: "batch-b" }),
    );
  });

  it("rejects a Student or Recruiter actor", async () => {
    await expect(useCase.execute({ actor: STUDENT, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(useCase.execute({ actor: RECRUITER, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("returns every role for a Secretary, unscoped", async () => {
    const results = await useCase.execute({ actor: SECRETARY, filters: {} });
    expect(results.map((r) => r.role).sort()).toEqual(["COORDINATOR", "RECRUITER", "SECRETARY", "STUDENT", "STUDENT"]);
  });

  it("scopes a Coordinator to only Students within their batch", async () => {
    const results = await useCase.execute({ actor: COORDINATOR_A, filters: {} });
    expect(results).toHaveLength(1);
    expect(results[0]!.fullName).toBe("Alan Student A");
  });

  it("filters by role for a Secretary", async () => {
    const results = await useCase.execute({ actor: SECRETARY, filters: { role: "RECRUITER" } });
    expect(results).toHaveLength(1);
    expect(results[0]!.companyName).toBe("Studio");
  });

  it("filters by free-text query across name", async () => {
    const results = await useCase.execute({ actor: SECRETARY, filters: { query: "Cara" } });
    expect(results).toHaveLength(1);
    expect(results[0]!.fullName).toBe("Cara Coordinator");
  });
});
