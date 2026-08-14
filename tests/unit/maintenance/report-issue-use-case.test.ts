import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/report-issue";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function buildContext() {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1", "sec-2"]) };
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new ReportMaintenanceIssueUseCase({
    maintenanceIssueRepository,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
  });
  return { useCase, maintenanceIssueRepository, notificationService, auditRecorder };
}

const VALID_INPUT = {
  category: "ELECTRICAL" as const,
  location: "Studio 3",
  description: "Flickering lights",
};

describe("ReportMaintenanceIssueUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a SUBMITTED issue for a Student complainant", async () => {
    const issue = await ctx.useCase.execute({ actor: STUDENT, ...VALID_INPUT });
    expect(issue.status).toBe("SUBMITTED");
    expect(issue.requesterId).toBe("stu-1");
  });

  it("denies a Recruiter from reporting", async () => {
    await expect(ctx.useCase.execute({ actor: RECRUITER, ...VALID_INPUT })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("notifies every active Secretary", async () => {
    await ctx.useCase.execute({ actor: STUDENT, ...VALID_INPUT });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-1", template: "MAINTENANCE_ISSUE_SUBMITTED" }),
    );
    expect(ctx.notificationService.sent).toContainEqual(expect.objectContaining({ recipientUserId: "sec-2" }));
  });

  it("records a MAINTENANCE_ISSUE_REPORTED audit entry", async () => {
    const issue = await ctx.useCase.execute({ actor: SECRETARY, ...VALID_INPUT });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "MAINTENANCE_ISSUE_REPORTED", targetEntityId: issue.id }),
    );
  });
});
