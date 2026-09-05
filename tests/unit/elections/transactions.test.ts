import { describe, expect, it, vi } from "vitest";
import { PrismaElectionRepository } from "../../../src/modules/elections/infrastructure/prisma-election-repository";
import { associateElectionCandidate } from "../../../src/modules/elections/infrastructure/associate-candidate";
import { PrismaFormApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";
import { electionConfigSchema } from "../../../src/modules/elections/domain/election";

const config = electionConfigSchema.parse({
  title: "Election",
  academicYear: "2026-2027",
  type: "COUNCIL",
  applicationOpenAt: new Date(Date.now() - 60000),
  applicationCloseAt: new Date(Date.now() + 60000),
});
function electionTx(status = "APPLICATION_OPEN") {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "election" }]),
    election: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          ...config,
          id: "election",
          status,
          applicationForm: { formId: "form" },
          positions: [{ id: "position" }],
        }),
      updateMany: vi.fn(),
    },
    electionCandidate: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "candidate" }),
    },
    electionApplicationForm: {
      findUnique: vi.fn().mockResolvedValue({ electionId: "election", formId: "form" }),
      upsert: vi.fn(),
    },
    formApplication: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          id: "application",
          submission: { formId: "form", applicantUserId: "student", studentProfileId: "profile" },
        }),
    },
    electionPosition: { deleteMany: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}
describe("election transaction boundaries", () => {
  it.each(["APPLICATION_OPEN", "APPLICATION_CLOSED"])(
    "rejects all configuration mutations under the %s row lock",
    async (status) => {
      const tx = electionTx(status);
      const repository = new PrismaElectionRepository({
        $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
      } as never);
      for (const operation of [
        () => repository.update("election", config, "secretary"),
        () =>
          repository.savePosition(
            "election",
            "position",
            { title: "Changed", description: "", seats: 1, displayOrder: 0, weights: [] },
            "secretary",
          ),
        () => repository.deletePosition("election", "position", "secretary"),
        () => repository.linkForm("election", "other-form", "secretary"),
      ])
        await expect(operation()).rejects.toThrow("locked");
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.election.updateMany).not.toHaveBeenCalled();
      expect(tx.electionPosition.deleteMany).not.toHaveBeenCalled();
      expect(tx.electionApplicationForm.upsert).not.toHaveBeenCalled();
    },
  );
  it("creates one candidate from the existing application and audits no answers", async () => {
    const tx = electionTx();
    await associateElectionCandidate(tx as never, {
      formId: "form",
      applicationId: "application",
      applicantUserId: "student",
      electionPositionIds: ["position"],
    });
    expect(tx.electionCandidate.create).toHaveBeenCalledWith({
      data: {
        electionId: "election",
        applicationId: "application",
        applicantUserId: "student",
        positions: {
          create: [
            {
              position: {
                connect: {
                  id_electionId: { id: "position", electionId: "election" },
                },
              },
            },
          ],
        },
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("answers");
  });
  it("makes exact candidate association retries idempotent but refuses different positions", async () => {
    const tx = electionTx();
    tx.electionCandidate.findUnique.mockResolvedValue({
      applicationId: "application",
      positions: [{ positionId: "position" }],
    } as never);
    await associateElectionCandidate(tx as never, {
      formId: "form",
      applicationId: "application",
      applicantUserId: "student",
      electionPositionIds: ["position"],
    });
    expect(tx.electionCandidate.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    await expect(
      associateElectionCandidate(tx as never, {
        formId: "form",
        applicationId: "application",
        applicantUserId: "student",
        electionPositionIds: ["other-position"],
      }),
    ).rejects.toThrow("already exists");
  });
  it.each([
    { electionPositionIds: [] },
    { electionPositionIds: ["invalid"] },
    { electionPositionIds: ["position", "position"] },
  ])("rejects invalid selected positions $electionPositionIds", async ({ electionPositionIds }) => {
    const tx = electionTx();
    await expect(
      associateElectionCandidate(tx as never, {
        formId: "form",
        applicationId: "application",
        applicantUserId: "student",
        electionPositionIds,
      }),
    ).rejects.toThrow("positions");
    expect(tx.electionCandidate.create).not.toHaveBeenCalled();
  });
  it("rejects inactive students, closed windows and mismatched application owners", async () => {
    const input = {
      formId: "form",
      applicationId: "application",
      applicantUserId: "student",
      electionPositionIds: ["position"],
    };
    const inactive = electionTx();
    inactive.$queryRaw.mockResolvedValueOnce([{ id: "election" }]).mockResolvedValueOnce([]);
    await expect(associateElectionCandidate(inactive as never, input)).rejects.toThrow(
      "active students",
    );
    await expect(
      associateElectionCandidate(electionTx("APPLICATION_CLOSED") as never, input),
    ).rejects.toThrow("not open");
    await expect(
      associateElectionCandidate(electionTx() as never, {
        ...input,
        applicantUserId: "other-student",
      }),
    ).rejects.toThrow("Invalid election application");
  });
  it("propagates election rejection inside the existing form submission transaction", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ status: "PUBLISHED", deadline: null }]),
      formSubmission: { create: vi.fn().mockResolvedValue({ id: "submission" }) },
      formApplication: { create: vi.fn().mockResolvedValue({ id: "application" }) },
    };
    const hook = vi.fn().mockRejectedValue(new Error("Election closed"));
    let committed = false;
    const repository = new PrismaFormApplicationRepository(
      {
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const result = await fn(tx);
          committed = true;
          return result;
        },
      } as never,
      hook,
    );
    await expect(
      repository.createSubmitted({
        formId: "form",
        applicantUserId: "student",
        studentProfileId: "profile",
        answers: {},
        actorUserId: "student",
        electionPositionIds: ["position"],
      }),
    ).rejects.toThrow("Election closed");
    expect(committed).toBe(false);
    expect(hook).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ applicationId: "application", electionPositionIds: ["position"] }),
    );
  });
});
