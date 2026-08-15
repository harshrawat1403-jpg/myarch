import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResolveMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/resolve-issue";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";

vi.mock("../../../src/modules/maintenance/application/task-engine-bridge", () => ({
  setLinkedTaskStatus: vi.fn().mockResolvedValue({ id: "task-1" }),
}));

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(overrides: Partial<MaintenanceIssueRecord> = {}): MaintenanceIssueRecord {
  const now = new Date();
  return {
    id: "issue-1",
    category: "ELECTRICAL",
    location: "Main Gate",
    description: "Flickering light",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    requesterId: "stu-1",
    publicReporterName: null,
    publicReporterEmail: null,
    assigneeId: "coord-1",
    deadline: null,
    taskId: "task-1",
    resolutionDetails: null,
    acknowledgedAt: now,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: MaintenanceIssueRecord) {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  maintenanceIssueRepository.seed(seed);
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const sendPublicReporterEmail = vi.fn().mockResolvedValue(undefined);
  const useCase = new ResolveMaintenanceIssueUseCase({
    maintenanceIssueRepository,
    notificationService,
    auditRecorder,
    sendPublicReporterEmail,
  });
  return { useCase, notificationService, sendPublicReporterEmail };
}

describe("ResolveMaintenanceIssueUseCase — complainant notification branch", () => {
  it("notifies the requester through the normal NotificationService when requesterId is set", async () => {
    const ctx = buildContext(record({ requesterId: "stu-1" }));
    await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", resolutionDetails: "Fixed" });

    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "MAINTENANCE_ISSUE_RESOLVED" }),
    );
    expect(ctx.sendPublicReporterEmail).not.toHaveBeenCalled();
  });

  it("sends a direct email to the public reporter instead, when the issue was reported anonymously", async () => {
    const ctx = buildContext(
      record({ requesterId: null, publicReporterName: "Jane Visitor", publicReporterEmail: "jane@example.com" }),
    );
    await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", resolutionDetails: "Fixed" });

    expect(ctx.notificationService.sent).toHaveLength(0);
    expect(ctx.sendPublicReporterEmail).toHaveBeenCalledTimes(1);
    const [message] = ctx.sendPublicReporterEmail.mock.calls[0]!;
    expect(message.to).toBe("jane@example.com");
    expect(message.subject).toContain("Main Gate");
  });

  it("does nothing (crashes neither notify nor email) when an anonymous issue somehow has no reporter email", async () => {
    const ctx = buildContext(record({ requesterId: null, publicReporterName: null, publicReporterEmail: null }));
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", resolutionDetails: "Fixed" }),
    ).resolves.toBeDefined();
    expect(ctx.notificationService.sent).toHaveLength(0);
    expect(ctx.sendPublicReporterEmail).not.toHaveBeenCalled();
  });

  it("a failed direct-email send is swallowed (best-effort) and does not fail the resolution", async () => {
    const ctx = buildContext(
      record({ requesterId: null, publicReporterName: "Jane Visitor", publicReporterEmail: "jane@example.com" }),
    );
    ctx.sendPublicReporterEmail.mockRejectedValueOnce(new Error("Resend API request failed"));

    const result = await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", resolutionDetails: "Fixed" });
    expect(result.status).toBe("RESOLVED");
  });
});
