import { describe, expect, it, vi } from "vitest";
import { PrismaCoreCommitteeSelectionRepository } from "../../../src/modules/selections/infrastructure/prisma-core-committee-selection-repository";

describe("Core Committee permanent deletion transaction", () => {
  it("deletes a legacy Draft selection through one bounded transaction client", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const deleteAppointment = vi.fn().mockResolvedValue({ count: 0 });
    const deletePublication = vi.fn().mockResolvedValue({ count: 0 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      coreCommitteeSelection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "selection",
          title: "Legacy Core",
          status: "DRAFT",
          positions: [],
          applicationForm: null,
        }),
        delete: vi.fn().mockResolvedValue({ id: "selection" }),
      },
      coreCommitteeSelectionCandidate: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany,
      },
      coreCommitteeSelectionShortlistEntry: { count: vi.fn().mockResolvedValue(0), deleteMany },
      coreCommitteeSelectionInterview: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany,
      },
      coreCommitteeSelectionInterviewHistory: { deleteMany },
      coreCommitteeCouncilReview: { deleteMany },
      coreCommitteeSelectionDecision: { deleteMany },
      coreCommitteeSelectionAppointment: { deleteMany: deleteAppointment },
      coreCommitteeSelectionCorrectionRequest: { deleteMany },
      coreCommitteeSelectionScrutinyReview: { deleteMany },
      coreCommitteeSelectionCandidatePosition: { deleteMany },
      coreCommitteeSelectionDeadlineExtension: { deleteMany },
      coreCommitteeSelectionQuestion: { deleteMany },
      coreCommitteeSelectionPublication: { deleteMany: deletePublication },
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

    await expect(
      repository.delete({
        selectionId: "selection",
        actorUserId: "secretary",
        confirmation: undefined,
      }),
    ).resolves.toEqual({ applications: 0, shortlisted: 0, interviews: 0 });

    expect(root.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxWait: 10_000, timeout: 20_000, isolationLevel: "Serializable" }),
    );
    expect(tx.coreCommitteeSelection.delete).toHaveBeenCalledWith({ where: { id: "selection" } });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(String(tx.$executeRaw.mock.calls[0]?.[0])).toContain("allow_core_publication_delete");
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      deletePublication.mock.invocationCallOrder[0]!,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMany.mock.invocationCallOrder[0]!,
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetEntityId: "selection" }),
      }),
    );
    expect(deleteMany).toHaveBeenCalled();
  });

  it("refuses to delete a populated selection before any applicant records are touched", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const deleteAppointment = vi.fn().mockResolvedValue({ count: 1 });
    const deleteDecision = vi.fn().mockResolvedValue({ count: 1 });
    const deletePublication = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      coreCommitteeSelection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "selection",
          title: "Populated Core",
          status: "APPLICATION_OPEN",
          positions: [],
          applicationForm: { managedForm: true, formId: "managed-form" },
        }),
        delete: vi.fn().mockResolvedValue({ id: "selection" }),
      },
      coreCommitteeSelectionCandidate: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: "candidate", applicationId: "application" }]),
        deleteMany,
      },
      formApplication: { count: vi.fn().mockResolvedValue(1) },
      formSubmission: { count: vi.fn().mockResolvedValue(1) },
      coreCommitteeSelectionShortlistEntry: { count: vi.fn().mockResolvedValue(1), deleteMany },
      coreCommitteeSelectionInterview: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: "interview" }]),
        deleteMany,
      },
      coreCommitteeSelectionInterviewHistory: { deleteMany },
      coreCommitteeCouncilReview: { deleteMany },
      coreCommitteeSelectionDecision: { deleteMany: deleteDecision },
      coreCommitteeSelectionAppointment: { deleteMany: deleteAppointment },
      coreCommitteeSelectionCorrectionRequest: { deleteMany },
      coreCommitteeSelectionScrutinyReview: { deleteMany },
      coreCommitteeSelectionCandidatePosition: { deleteMany },
      coreCommitteeSelectionDeadlineExtension: { deleteMany },
      coreCommitteeSelectionQuestion: { deleteMany },
      coreCommitteeSelectionPublication: { deleteMany: deletePublication },
      coreCommitteeSelectionPosition: { deleteMany },
      coreCommitteeSelectionApplicationForm: { deleteMany },
      form: { delete: vi.fn().mockResolvedValue({ id: "managed-form" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const root = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const repository = new PrismaCoreCommitteeSelectionRepository(root as never);

    await expect(
      repository.delete({
        selectionId: "selection",
        actorUserId: "secretary",
        confirmation: "DELETE CORE SELECTION",
      }),
    ).rejects.toMatchObject({
      message: "This Core Committee form has submitted applications and cannot be permanently deleted. Applicant history has been preserved.",
    });

    expect(tx.coreCommitteeSelection.delete).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteAppointment).not.toHaveBeenCalled();
    expect(deleteDecision).not.toHaveBeenCalled();
    expect(deletePublication).not.toHaveBeenCalled();
    expect(tx.form.delete).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
