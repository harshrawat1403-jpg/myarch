import { describe, expect, it, vi } from "vitest";
import { PrismaCoreCommitteeSelectionRepository } from "../../../src/modules/selections/infrastructure/prisma-core-committee-selection-repository";

describe("archived Core Committee student access", () => {
  it("excludes archived selections from list, direct-view, and submission preflight queries", async () => {
    const coreCommitteeSelection = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    };
    const repository = new PrismaCoreCommitteeSelectionRepository({ coreCommitteeSelection } as never);

    await expect(repository.list(false)).resolves.toEqual([]);
    await expect(repository.listForStudent("student")).resolves.toEqual([]);
    await expect(repository.getForStudent("selection", "student")).resolves.toBeNull();
    await expect(repository.getStudentApplicationFormId("selection")).resolves.toBeNull();

    expect(coreCommitteeSelection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { notIn: ["DRAFT", "ARCHIVED"] } } }),
    );
    expect(coreCommitteeSelection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { notIn: ["DRAFT", "ARCHIVED"] } } }),
    );
    expect(coreCommitteeSelection.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "selection", status: { notIn: ["DRAFT", "ARCHIVED"] } },
      }),
    );
    expect(coreCommitteeSelection.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "selection",
          status: "APPLICATION_OPEN",
          applicationOpenAt: expect.objectContaining({ lte: expect.any(Date) }),
          applicationCloseAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });
});
