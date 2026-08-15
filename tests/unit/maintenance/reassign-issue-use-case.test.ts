import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InvalidMaintenanceAssigneeError } from "../../../src/modules/maintenance";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";
import { ReassignMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/reassign-issue";
import { reassignLinkedTask } from "../../../src/modules/maintenance/application/task-engine-bridge";

vi.mock("../../../src/modules/maintenance/application/task-engine-bridge", () => ({
  reassignLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
}));

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(overrides: Partial<MaintenanceIssueRecord> = {}): MaintenanceIssueRecord {
  const now = new Date();
  return {
    id: "issue-1",
    category: "HVAC",
    location: "Studio 1",
    description: "AC not working",
    priority: "HIGH",
    status: "ASSIGNED",
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

function buildContext(seed: MaintenanceIssueRecord = record()) {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  maintenanceIssueRepository.seed(seed);
  const userRoleLookup = new FakeUserRoleLookup();
  userRoleLookup.seed("coord-2", "COORDINATOR");
  userRoleLookup.seed("stu-1", "STUDENT");
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new ReassignMaintenanceIssueUseCase({ maintenanceIssueRepository, userRoleLookup, auditRecorder });
  return { useCase };
}

describe("ReassignMaintenanceIssueUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reassigns to a new Coordinator and updates the linked Task", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "coord-2" });
    expect(updated.assigneeId).toBe("coord-2");
    expect(reassignLinkedTask).toHaveBeenCalledWith(SECRETARY, "task-1", "coord-2");
  });

  it("rejects reassigning to a Student", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "stu-1" })).rejects.toBeInstanceOf(
      InvalidMaintenanceAssigneeError,
    );
  });

  it("rejects reassigning an issue that was never assigned", async () => {
    const ctx = buildContext(record({ status: "SUBMITTED", taskId: null, assigneeId: null }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "coord-2" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});
