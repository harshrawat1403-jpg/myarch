import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitRequestUseCase } from "../../../src/modules/requests/application/use-cases/submit-request";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRequestRepository } from "../../support/fakes/in-memory-request-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function buildContext() {
  const requestRepository = new InMemoryRequestRepository();
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1"]) };
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new SubmitRequestUseCase({ requestRepository, secretaryRecipientLookup, notificationService, auditRecorder });
  return { useCase, notificationService, auditRecorder };
}

const VALID_INPUT = { type: "Budget approval", description: "Need funds for the studio trip" };

describe("SubmitRequestUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a SUBMITTED request", async () => {
    const request = await ctx.useCase.execute({ actor: STUDENT, ...VALID_INPUT });
    expect(request.status).toBe("SUBMITTED");
    expect(request.requesterId).toBe("stu-1");
  });

  it("denies a Recruiter", async () => {
    await expect(ctx.useCase.execute({ actor: RECRUITER, ...VALID_INPUT })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("notifies every active Secretary", async () => {
    await ctx.useCase.execute({ actor: STUDENT, ...VALID_INPUT });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-1", template: "REQUEST_SUBMITTED" }),
    );
  });

  it("records a REQUEST_SUBMITTED audit entry", async () => {
    const request = await ctx.useCase.execute({ actor: STUDENT, ...VALID_INPUT });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "REQUEST_SUBMITTED", targetEntityId: request.id }),
    );
  });
});
