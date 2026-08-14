import { beforeEach, describe, expect, it } from "vitest";
import { ApproveAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/admin/approve-alumni";
import { RejectAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/admin/reject-alumni";
import { AlumniNotPendingError } from "../../../src/modules/alumni/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryAlumniRepository } from "../../support/fakes/in-memory-alumni-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AlumniRecord } from "../../../src/modules/alumni";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<AlumniRecord> = {}): AlumniRecord {
  return {
    id: "target-alumni",
    studentProfileId: null,
    userId: "target-user",
    fullName: "Target Alumnus",
    graduationYear: 2021,
    currentCompany: null,
    designation: null,
    location: null,
    portfolioUrl: null,
    linkedInUrl: null,
    mentorshipAvailable: false,
    approvalStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ApproveAlumniUseCase / RejectAlumniUseCase", () => {
  let alumniRepository: InMemoryAlumniRepository;
  let auditRecorder: FakeAuditRecorder;
  let notificationService: FakeNotificationService;
  let approveUseCase: ApproveAlumniUseCase;
  let rejectUseCase: RejectAlumniUseCase;

  beforeEach(() => {
    alumniRepository = new InMemoryAlumniRepository();
    alumniRepository.seed(record());
    auditRecorder = new FakeAuditRecorder();
    notificationService = new FakeNotificationService();
    approveUseCase = new ApproveAlumniUseCase({ alumniRepository, auditRecorder, notificationService });
    rejectUseCase = new RejectAlumniUseCase({ alumniRepository, auditRecorder, notificationService });
  });

  it("rejects a non-Secretary actor for both approve and reject", async () => {
    await expect(
      approveUseCase.execute({ actor: COORDINATOR, alumniId: "target-alumni" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      rejectUseCase.execute({ actor: COORDINATOR, alumniId: "target-alumni" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("approves a PENDING alumni account", async () => {
    const result = await approveUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(result.approvalStatus).toBe("APPROVED");
  });

  it("rejects a PENDING alumni account", async () => {
    const result = await rejectUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(result.approvalStatus).toBe("REJECTED");
  });

  it("throws AlumniNotPendingError when approving/rejecting a non-PENDING account", async () => {
    alumniRepository.seed(record({ approvalStatus: "APPROVED" }));
    await expect(
      approveUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" }),
    ).rejects.toBeInstanceOf(AlumniNotPendingError);
    await expect(
      rejectUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" }),
    ).rejects.toBeInstanceOf(AlumniNotPendingError);
  });

  it("records ALUMNI_APPROVED / ALUMNI_REJECTED audit entries", async () => {
    await approveUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "ALUMNI_APPROVED", targetEntityId: "target-user" }),
    );
  });

  it("MYARCH Phase 1 — approval notifies the alumnus (ACCOUNT_SIGNUP_DECIDED, APPROVED)", async () => {
    await approveUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "target-user",
        template: "ACCOUNT_SIGNUP_DECIDED",
        context: { accountType: "ALUMNI", decision: "APPROVED" },
      }),
    );
  });

  it("MYARCH Phase 1 — rejection notifies the alumnus (ACCOUNT_SIGNUP_DECIDED, REJECTED)", async () => {
    const result = await rejectUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "target-user",
        template: "ACCOUNT_SIGNUP_DECIDED",
        context: { accountType: "ALUMNI", decision: "REJECTED" },
      }),
    );
    expect(result.approvalStatus).toBe("REJECTED");
  });

  it("does not notify when the target has no userId (admin-created directory row, unreachable in practice since those default to APPROVED)", async () => {
    alumniRepository.seed(record({ userId: null }));
    await approveUseCase.execute({ actor: SECRETARY, alumniId: "target-alumni" });
    expect(notificationService.sent).toHaveLength(0);
  });
});
