import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";
import { MaintenanceIssueNotReopenableError } from "../../../src/modules/maintenance";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { AcknowledgeMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/acknowledge-issue";
import { AssignMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/assign-issue";
import { StartMaintenanceIssueProgressUseCase } from "../../../src/modules/maintenance/application/use-cases/start-progress";
import { ResolveMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/resolve-issue";
import { ConfirmMaintenanceResolutionUseCase } from "../../../src/modules/maintenance/application/use-cases/confirm-resolution";
import { CloseMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/close-issue";
import { ReopenMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/reopen-issue";
import * as taskEngineBridge from "../../../src/modules/maintenance/application/task-engine-bridge";

vi.mock("../../../src/modules/maintenance/application/task-engine-bridge", () => ({
  createLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
  setLinkedTaskStatus: vi.fn().mockResolvedValue({ id: "task-1" }),
  reopenLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
  reassignLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
  updateLinkedTaskDeadline: vi.fn().mockResolvedValue({ id: "task-1" }),
}));

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

describe("Maintenance workflow — full lifecycle end to end", () => {
  let repo: InMemoryMaintenanceIssueRepository;
  let userRoleLookup: FakeUserRoleLookup;
  let auditRecorder: FakeAuditRecorder;
  let notificationService: FakeNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new InMemoryMaintenanceIssueRepository();
    repo.seed({
      id: "issue-1",
      category: "SAFETY",
      location: "Workshop A",
      description: "Exposed wiring",
      priority: "URGENT",
      status: "SUBMITTED",
      requesterId: "stu-1",
      assigneeId: null,
      deadline: null,
      taskId: null,
      resolutionDetails: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies MaintenanceIssueRecord);
    userRoleLookup = new FakeUserRoleLookup();
    userRoleLookup.seed("coord-1", "COORDINATOR");
    auditRecorder = new FakeAuditRecorder();
    notificationService = new FakeNotificationService();
  });

  it("SUBMITTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED → CLOSED → REOPENED", async () => {
    const acknowledge = new AcknowledgeMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    const assign = new AssignMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, userRoleLookup, auditRecorder });
    const startProgress = new StartMaintenanceIssueProgressUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    const resolve = new ResolveMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, notificationService, auditRecorder });
    const confirm = new ConfirmMaintenanceResolutionUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    const close = new CloseMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    const reopen = new ReopenMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, auditRecorder });

    let issue = await acknowledge.execute({ actor: SECRETARY, issueId: "issue-1" });
    expect(issue.status).toBe("ACKNOWLEDGED");

    issue = await assign.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "coord-1" });
    expect(issue.status).toBe("ASSIGNED");
    expect(issue.taskId).toBe("task-1");

    issue = await startProgress.execute({ actor: SECRETARY, issueId: "issue-1" });
    expect(issue.status).toBe("IN_PROGRESS");
    expect(taskEngineBridge.setLinkedTaskStatus).toHaveBeenCalledWith(SECRETARY, "task-1", "IN_PROGRESS");

    issue = await resolve.execute({ actor: SECRETARY, issueId: "issue-1", resolutionDetails: "Rewired the panel" });
    expect(issue.status).toBe("RESOLVED");
    expect(issue.resolutionDetails).toBe("Rewired the panel");
    expect(taskEngineBridge.setLinkedTaskStatus).toHaveBeenCalledWith(SECRETARY, "task-1", "DONE");
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "MAINTENANCE_ISSUE_RESOLVED" }),
    );

    // The complainant confirms.
    issue = await confirm.execute({ actor: STUDENT, issueId: "issue-1" });
    expect(issue.status).toBe("VERIFIED");

    issue = await close.execute({ actor: SECRETARY, issueId: "issue-1" });
    expect(issue.status).toBe("CLOSED");

    // The complainant reopens — problem persists.
    issue = await reopen.execute({ actor: STUDENT, issueId: "issue-1" });
    expect(issue.status).toBe("REOPENED");
    expect(taskEngineBridge.reopenLinkedTask).toHaveBeenCalledWith(STUDENT, "task-1");
  });

  it("rejects reopening a non-terminal issue", async () => {
    repo.seed({
      id: "issue-2",
      category: "SAFETY",
      location: "Workshop B",
      description: "x",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      requesterId: "stu-1",
      assigneeId: "coord-1",
      deadline: null,
      taskId: "task-2",
      resolutionDetails: null,
      acknowledgedAt: new Date(),
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies MaintenanceIssueRecord);
    const reopen = new ReopenMaintenanceIssueUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    await expect(reopen.execute({ actor: STUDENT, issueId: "issue-2" })).rejects.toBeInstanceOf(MaintenanceIssueNotReopenableError);
  });

  it("denies an unrelated Student from confirming resolution", async () => {
    repo.seed({
      id: "issue-3",
      category: "SAFETY",
      location: "Workshop C",
      description: "x",
      priority: "MEDIUM",
      status: "RESOLVED",
      requesterId: "stu-1",
      assigneeId: "coord-1",
      deadline: null,
      taskId: "task-3",
      resolutionDetails: "fixed",
      acknowledgedAt: new Date(),
      resolvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies MaintenanceIssueRecord);
    const confirm = new ConfirmMaintenanceResolutionUseCase({ maintenanceIssueRepository: repo, auditRecorder });
    const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };
    await expect(confirm.execute({ actor: OTHER_STUDENT, issueId: "issue-3" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
