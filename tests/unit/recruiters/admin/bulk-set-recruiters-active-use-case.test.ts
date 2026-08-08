import { beforeEach, describe, expect, it } from "vitest";
import { SetRecruiterActiveUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/set-recruiter-active";
import { BulkSetRecruitersActiveUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/bulk-set-recruiters-active";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import type { RecruiterAccountRecord } from "../../../../src/modules/recruiters";
import type { AuthenticatedActor } from "../../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(id: string): RecruiterAccountRecord {
  return {
    id,
    userId: `user-${id}`,
    email: `${id}@studio.com`,
    fullName: `Recruiter ${id}`,
    companyName: "Studio",
    isActive: true,
    approvalStatus: "APPROVED",
    createdAt: new Date(),
  };
}

describe("BulkSetRecruitersActiveUseCase", () => {
  let recruiterAccountRepository: InMemoryRecruiterAccountRepository;
  let auditRecorder: FakeAuditRecorder;
  let bulkUseCase: BulkSetRecruitersActiveUseCase;

  beforeEach(() => {
    recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record("r1"));
    recruiterAccountRepository.seed(record("r2"));
    recruiterAccountRepository.seed(record("r3"));
    auditRecorder = new FakeAuditRecorder();
    const setRecruiterActiveUseCase = new SetRecruiterActiveUseCase({
      recruiterAccountRepository,
      auditRecorder,
      revokeUserSessions: async () => {},
    });
    bulkUseCase = new BulkSetRecruitersActiveUseCase({ setRecruiterActiveUseCase, auditRecorder });
  });

  it("disables every recruiter id given and reports them as succeeded", async () => {
    const result = await bulkUseCase.execute({ actor: SECRETARY, recruiterIds: ["r1", "r2", "r3"], isActive: false });

    expect(result.succeeded).toEqual(["r1", "r2", "r3"]);
    expect(result.failed).toHaveLength(0);
    expect((await recruiterAccountRepository.findById("r1"))!.isActive).toBe(false);
  });

  it("collects a per-id failure without aborting the rest of the batch", async () => {
    const result = await bulkUseCase.execute({
      actor: SECRETARY,
      recruiterIds: ["r1", "does-not-exist", "r3"],
      isActive: false,
    });

    expect(result.succeeded).toEqual(["r1", "r3"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.id).toBe("does-not-exist");
  });

  it("records a single BULK_OPERATION audit entry summarizing the batch", async () => {
    await bulkUseCase.execute({ actor: SECRETARY, recruiterIds: ["r1", "r2"], isActive: false });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        action: "BULK_OPERATION",
        metadata: expect.objectContaining({ entityType: "recruiter", operation: "disable", count: 2 }),
      }),
    );
  });
});
