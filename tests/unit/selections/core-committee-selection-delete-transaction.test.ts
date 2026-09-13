import { describe, expect, it, vi } from "vitest";
import { PrismaCoreCommitteeSelectionRepository } from "../../../src/modules/selections/infrastructure/prisma-core-committee-selection-repository";

describe("Core Committee permanent deletion transaction", () => {
  it("deletes a legacy Draft selection through one bounded transaction client", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      coreCommitteeSelection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "selection", title: "Legacy Core", status: "DRAFT", positions: [], applicationForm: null,
        }),
        delete: vi.fn().mockResolvedValue({ id: "selection" }),
      },
      coreCommitteeSelectionCandidate: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), deleteMany },
      coreCommitteeSelectionShortlistEntry: { count: vi.fn().mockResolvedValue(0), deleteMany },
      coreCommitteeSelectionInterview: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), deleteMany },
      coreCommitteeSelectionInterviewHistory: { deleteMany },
      coreCommitteeCouncilReview: { deleteMany },
      coreCommitteeSelectionDecision: { deleteMany },
      coreCommitteeSelectionCorrectionRequest: { deleteMany },
      coreCommitteeSelectionScrutinyReview: { deleteMany },
      coreCommitteeSelectionCandidatePosition: { deleteMany },
      coreCommitteeSelectionDeadlineExtension: { deleteMany },
      coreCommitteeSelectionPublication: { deleteMany },
      coreCommitteeSelectionPosition: { deleteMany },
      coreCommitteeSelectionApplicationForm: { deleteMany },
      form: { delete: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const root = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>, options: unknown) =>
        work(tx),
      ),
    };
    const repository = new PrismaCoreCommitteeSelectionRepository(root as never);

    await expect(repository.delete({ selectionId: "selection", actorUserId: "secretary", confirmation: undefined }))
      .resolves.toEqual({ applications: 0, shortlisted: 0, interviews: 0 });

    expect(root.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxWait: 10_000, timeout: 20_000, isolationLevel: "Serializable" }),
    );
    expect(tx.coreCommitteeSelection.delete).toHaveBeenCalledWith({ where: { id: "selection" } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ targetEntityId: "selection" }),
    }));
    expect(deleteMany).toHaveBeenCalled();
  });

  it("keeps a populated deletion and its audit record on the transaction client", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      coreCommitteeSelection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "selection", title: "Populated Core", status: "APPLICATION_OPEN", positions: [],
          applicationForm: { managedForm: true, formId: "managed-form" },
        }),
        delete: vi.fn().mockResolvedValue({ id: "selection" }),
      },
      coreCommitteeSelectionCandidate: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: "candidate", applicationId: "application" }]),
        deleteMany,
      },
      coreCommitteeSelectionShortlistEntry: { count: vi.fn().mockResolvedValue(1), deleteMany },
      coreCommitteeSelectionInterview: { count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue([{ id: "interview" }]), deleteMany },
      coreCommitteeSelectionInterviewHistory: { deleteMany },
      coreCommitteeCouncilReview: { deleteMany },
      coreCommitteeSelectionDecision: { deleteMany },
      coreCommitteeSelectionCorrectionRequest: { deleteMany },
      coreCommitteeSelectionScrutinyReview: { deleteMany },
      coreCommitteeSelectionCandidatePosition: { deleteMany },
      coreCommitteeSelectionDeadlineExtension: { deleteMany },
      coreCommitteeSelectionPublication: { deleteMany },
      coreCommitteeSelectionPosition: { deleteMany },
      coreCommitteeSelectionApplicationForm: { deleteMany },
      form: { delete: vi.fn().mockResolvedValue({ id: "managed-form" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const root = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const repository = new PrismaCoreCommitteeSelectionRepository(root as never);

    await expect(repository.delete({
      selectionId: "selection",
      actorUserId: "secretary",
      confirmation: "DELETE CORE SELECTION",
    })).resolves.toEqual({ applications: 1, shortlisted: 1, interviews: 1 });

    expect(tx.coreCommitteeSelectionInterviewHistory.deleteMany).toHaveBeenCalledWith({
      where: { interviewId: { in: ["interview"] } },
    });
    expect(tx.coreCommitteeSelectionCandidatePosition.deleteMany).toHaveBeenCalledWith({
      where: { candidateId: { in: ["candidate"] } },
    });
    expect(tx.form.delete).toHaveBeenCalledWith({ where: { id: "managed-form" } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        targetEntityId: "selection",
        metadata: { title: "Populated Core", lifecycleState: "APPLICATION_OPEN", applications: 1, interviews: 1 },
      }),
    }));
  });
});
