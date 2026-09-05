import { describe, expect, it, vi } from "vitest";
import { CoreCommitteeSelectionUseCases } from "../../../src/modules/selections/application/core-committee-selection-use-cases";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { CoreCommitteeSelectionRepository } from "../../../src/modules/selections/application/ports/core-committee-selection-repository";
const secretary = { role: "SECRETARY" as const, userId: "secretary" };
const councilMember = { role: "STUDENT" as const, userId: "council-member" };
const selection = {
  id: "selection",
  title: "Core",
  academicYear: "2026-2027",
  status: "COUNCIL_REVIEW" as const,
  applicationOpenAt: new Date("2026-09-01"),
  applicationCloseAt: new Date("2026-09-10"),
  correctionOpenAt: null,
  correctionCloseAt: null,
  maxPositionsPerCandidate: 1,
  configurationLockedAt: new Date(),
  createdAt: new Date(),
  positions: [],
  applicationForm: null,
};
function setup(currentCouncil: string | null = "council") {
  const repository = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(selection),
    create: vi.fn(),
    update: vi.fn(),
    savePosition: vi.fn(),
    linkForm: vi.fn(),
    transition: vi.fn(),
    candidates: vi.fn(),
    currentCouncilCommittee: vi.fn().mockResolvedValue(currentCouncil),
    recordCouncilReview: vi.fn(),
    recordDecision: vi.fn(),
    finalizeDecision: vi.fn(),
    processing: vi.fn(),
  };
  return {
    repository,
    useCases: new CoreCommitteeSelectionUseCases(
      repository as unknown as CoreCommitteeSelectionRepository,
    ),
  };
}
describe("Core Committee selection authority", () => {
  it("lets the Secretary administer configuration and finalization", async () => {
    const { useCases, repository } = setup();
    await useCases.create(secretary, {
      title: "Core",
      academicYear: "2026-2027",
      applicationOpenAt: "2026-09-01",
      applicationCloseAt: "2026-09-10",
    });
    await useCases.finalizeDecision(secretary, "selection", "00000000-0000-4000-8000-000000000001");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Core" }),
      "secretary",
    );
    expect(repository.finalizeDecision).toHaveBeenCalled();
  });
  it("records Council review and decision only with resolved current Council authority", async () => {
    const { useCases, repository } = setup();
    const input = {
      candidateId: "00000000-0000-4000-8000-000000000002",
      positionId: "00000000-0000-4000-8000-000000000003",
      note: "Interview and record reviewed.",
    };
    await useCases.review(councilMember, "selection", input);
    await useCases.decision(councilMember, "selection", {
      candidateId: input.candidateId,
      positionId: input.positionId,
      outcome: "SELECTED",
      internalNote: "Council decision.",
    });
    expect(repository.recordCouncilReview).toHaveBeenCalledWith(
      expect.objectContaining({
        councilCommitteeId: "council",
        councilMemberUserId: "council-member",
      }),
    );
    expect(repository.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "SELECTED" }),
    );
  });
  it("denies non-Council students and all non-Secretary administrators", async () => {
    const { useCases, repository } = setup(null);
    await expect(
      useCases.review(councilMember, "selection", {
        candidateId: "00000000-0000-4000-8000-000000000002",
        positionId: "00000000-0000-4000-8000-000000000003",
        note: "No authority",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      useCases.create({ role: "COORDINATOR", userId: "coordinator" }, {}),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    expect(repository.recordCouncilReview).not.toHaveBeenCalled();
  });
});
