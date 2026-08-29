import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SearchCommitteesUseCase } from "../../../src/modules/committees/application/use-cases/search-committees";
import { InMemoryCommitteeRepository } from "../../support/fakes/in-memory-committee-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

async function buildContext() {
  const committeeRepository = new InMemoryCommitteeRepository();
  await committeeRepository.create({ name: "Student Council", type: "STUDENT_COUNCIL" });
  await committeeRepository.create({ name: "Tech Fest Committee", type: "EVENT_COMMITTEE" });
  const useCase = new SearchCommitteesUseCase({ committeeRepository });
  return { useCase };
}

describe("SearchCommitteesUseCase", () => {
  it("a Student sees every committee, unlike Meetings' involvingUserId scoping", async () => {
    const ctx = await buildContext();
    const result = await ctx.useCase.execute({ actor: STUDENT });
    expect(result.total).toBe(2);
  });

  it("filters by type", async () => {
    const ctx = await buildContext();
    const result = await ctx.useCase.execute({ actor: SECRETARY, filters: { type: "STUDENT_COUNCIL" } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("Student Council");
  });

  it("denies a Recruiter", async () => {
    const ctx = await buildContext();
    await expect(ctx.useCase.execute({ actor: RECRUITER })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
