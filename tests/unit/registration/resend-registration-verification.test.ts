import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendRegistrationVerificationUseCase } from "../../../src/modules/registration/application/use-cases/resend-registration-verification";
import {
  InvalidRegistrationTransitionError,
} from "../../../src/modules/registration/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { AUDIT_ACTIONS } from "../../../src/lib/audit-actions";
import { InMemoryRegistrationRequestRepository } from "../../support/fakes/in-memory-registration-request-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RegistrationRequestRecord } from "../../../src/modules/registration";

const SECRETARY: AuthenticatedActor = { userId: "secretary-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coordinator-1", role: "COORDINATOR", batchScope: ["batch-1"] };

function registration(overrides: Partial<RegistrationRequestRecord> = {}): RegistrationRequestRecord {
  const now = new Date();
  return {
    id: "legacy-request-1",
    email: "legacy.applicant@example.edu",
    fullName: "Legacy Applicant",
    rollNumber: "BA2027001",
    batchId: "batch-1",
    submittedData: {},
    status: "SUBMITTED",
    emailVerifiedAt: null,
    coordinatorComment: null,
    reviewedByUserId: null,
    reviewedAt: null,
    decidedByUserId: null,
    decidedAt: null,
    rejectionReason: null,
    resultingStudentProfileId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function setup() {
  const registrationRequestRepository = new InMemoryRegistrationRequestRepository();
  const auditRecorder = new FakeAuditRecorder();
  const issueEmailVerificationToken = vi.fn().mockResolvedValue(undefined);
  const useCase = new ResendRegistrationVerificationUseCase({
    registrationRequestRepository,
    issueEmailVerificationToken,
    auditRecorder,
  });
  return { registrationRequestRepository, auditRecorder, issueEmailVerificationToken, useCase };
}

describe("ResendRegistrationVerificationUseCase", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("recovers a legacy unverified request even when no earlier token exists", async () => {
    ctx.registrationRequestRepository.seed(registration());

    await expect(ctx.useCase.execute({ actor: SECRETARY, requestId: "legacy-request-1" })).resolves.toEqual({ resent: true });

    expect(ctx.issueEmailVerificationToken).toHaveBeenCalledWith({
      email: "legacy.applicant@example.edu",
      recipientName: "Legacy Applicant",
      registrationRequestId: "legacy-request-1",
    });
    expect(ctx.auditRecorder.entries).toContainEqual(expect.objectContaining({
      actorUserId: "secretary-1",
      action: AUDIT_ACTIONS.REGISTRATION_VERIFICATION_RESENT,
      targetEntityType: "RegistrationRequest",
      targetEntityId: "legacy-request-1",
    }));
    expect(JSON.stringify(ctx.auditRecorder.entries)).not.toContain("token");
  });

  it("does not issue another token for an already verified request", async () => {
    ctx.registrationRequestRepository.seed(registration({ emailVerifiedAt: new Date() }));

    await expect(ctx.useCase.execute({ actor: SECRETARY, requestId: "legacy-request-1" })).resolves.toEqual({ resent: false });
    expect(ctx.issueEmailVerificationToken).not.toHaveBeenCalled();
  });

  it("reserves the recovery action for the Secretary", async () => {
    ctx.registrationRequestRepository.seed(registration());

    await expect(ctx.useCase.execute({ actor: COORDINATOR, requestId: "legacy-request-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
    expect(ctx.issueEmailVerificationToken).not.toHaveBeenCalled();
  });

  it("does not issue verification for a registration that has already been decided", async () => {
    ctx.registrationRequestRepository.seed(registration({ status: "REJECTED", decidedAt: new Date() }));

    await expect(ctx.useCase.execute({ actor: SECRETARY, requestId: "legacy-request-1" })).rejects.toBeInstanceOf(
      InvalidRegistrationTransitionError,
    );
    expect(ctx.issueEmailVerificationToken).not.toHaveBeenCalled();
  });
});
