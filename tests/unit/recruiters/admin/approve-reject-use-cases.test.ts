import { beforeEach, describe, expect, it } from "vitest";
import { ApproveRecruiterUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/approve-recruiter";
import { RejectRecruiterUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/reject-recruiter";
import { RecruiterNotPendingError } from "../../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../../src/lib/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import type { RecruiterAccountRecord } from "../../../../src/modules/recruiters";
import type { AuthenticatedActor } from "../../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<RecruiterAccountRecord> = {}): RecruiterAccountRecord {
  return {
    id: "target-recruiter",
    userId: "target-user",
    email: "target@studio.com",
    fullName: "Target Recruiter",
    companyName: "Studio",
    isActive: true,
    approvalStatus: "PENDING",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ApproveRecruiterUseCase / RejectRecruiterUseCase", () => {
  let recruiterAccountRepository: InMemoryRecruiterAccountRepository;
  let auditRecorder: FakeAuditRecorder;
  let approveUseCase: ApproveRecruiterUseCase;
  let rejectUseCase: RejectRecruiterUseCase;

  beforeEach(() => {
    recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record());
    auditRecorder = new FakeAuditRecorder();
    approveUseCase = new ApproveRecruiterUseCase({ recruiterAccountRepository, auditRecorder });
    rejectUseCase = new RejectRecruiterUseCase({ recruiterAccountRepository, auditRecorder });
  });

  it("rejects a non-Secretary actor for both approve and reject", async () => {
    await expect(
      approveUseCase.execute({ actor: COORDINATOR, recruiterId: "target-recruiter" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      rejectUseCase.execute({ actor: COORDINATOR, recruiterId: "target-recruiter" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("approves a PENDING recruiter", async () => {
    const result = await approveUseCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter" });
    expect(result.approvalStatus).toBe("APPROVED");
  });

  it("rejects a PENDING recruiter", async () => {
    const result = await rejectUseCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter" });
    expect(result.approvalStatus).toBe("REJECTED");
  });

  it("throws RecruiterNotPendingError when approving/rejecting a non-PENDING recruiter", async () => {
    recruiterAccountRepository.seed(record({ approvalStatus: "APPROVED" }));
    await expect(
      approveUseCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter" }),
    ).rejects.toBeInstanceOf(RecruiterNotPendingError);
    await expect(
      rejectUseCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter" }),
    ).rejects.toBeInstanceOf(RecruiterNotPendingError);
  });

  it("records RECRUITER_APPROVED / RECRUITER_REJECTED audit entries", async () => {
    await approveUseCase.execute({ actor: SECRETARY, recruiterId: "target-recruiter" });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "RECRUITER_APPROVED", targetEntityId: "target-user" }),
    );
  });
});
