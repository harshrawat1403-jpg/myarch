import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ListStudentInterestsUseCase } from "../../../src/modules/recruiters/application/use-cases/list-student-interests";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("ListStudentInterestsUseCase", () => {
  let interestRepository: InMemoryRecruiterInterestRepository;
  let useCase: ListStudentInterestsUseCase;

  beforeEach(() => {
    interestRepository = new InMemoryRecruiterInterestRepository();
    interestRepository.seedCompanyName("rec-profile-1", "Acme Architects");
    interestRepository.seed({
      id: "int-1",
      recruiterProfileId: "rec-profile-1",
      studentProfileId: "s1",
      message: "Loved your portfolio.",
      status: "SENT",
      sentAt: new Date("2026-01-01"),
      respondedAt: null,
      completedAt: null,
    });
    interestRepository.seed({
      id: "int-2",
      recruiterProfileId: "rec-profile-1",
      studentProfileId: "s2",
      message: null,
      status: "SENT",
      sentAt: new Date("2026-01-02"),
      respondedAt: null,
      completedAt: null,
    });
    useCase = new ListStudentInterestsUseCase({ interestRepository });
  });

  it("returns only the requesting student's own interest requests, with the company name joined in", async () => {
    const result = await useCase.execute(student);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "int-1", companyName: "Acme Architects", message: "Loved your portfolio." });
  });

  it("never returns another student's interest requests", async () => {
    const result = await useCase.execute(otherStudent);
    expect(result.map((r) => r.id)).toEqual(["int-2"]);
    expect(result.map((r) => r.id)).not.toContain("int-1");
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
