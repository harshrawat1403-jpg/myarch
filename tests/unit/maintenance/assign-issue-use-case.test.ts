import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidMaintenanceAssigneeError, InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../../src/modules/maintenance";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";
import { AssignMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/assign-issue";
import { createLinkedTask } from "../../../src/modules/maintenance/application/task-engine-bridge";

// Vitest hoists vi.mock calls above imports, so this replaces the bridge
// module for every import above too — CreateAssignMaintenanceIssueUseCase
// never touches the real Task Engine (which is wired to a live Prisma
// repository, unsuitable for a unit test) while everything else about the
// use case's own logic (state machine, authorization, persistence) is
// exercised for real against the in-memory repository.
vi.mock("../../../src/modules/maintenance/application/task-engine-bridge", () => ({
  createLinkedTask: vi.fn(),
}));

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: ["maintenance.assign"] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function record(overrides: Partial<MaintenanceIssueRecord> = {}): MaintenanceIssueRecord {
  const now = new Date();
  return {
    id: "issue-1",
    category: "ELECTRICAL",
    location: "Studio 3",
    description: "Flickering lights",
    priority: "MEDIUM",
    status: "ACKNOWLEDGED",
    requesterId: "stu-1",
    publicReporterName: null,
    publicReporterEmail: null,
    assigneeId: null,
    deadline: null,
    taskId: null,
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
  const useCase = new AssignMaintenanceIssueUseCase({ maintenanceIssueRepository, userRoleLookup, auditRecorder });
  return { useCase, maintenanceIssueRepository, auditRecorder };
}

describe("AssignMaintenanceIssueUseCase", () => {
  beforeEach(() => {
    vi.mocked(createLinkedTask).mockClear();
    vi.mocked(createLinkedTask).mockResolvedValue({ id: "task-1" } as never);
  });

  it("assigns to a Coordinator and creates the linked Task", async () => {
    const ctx = buildContext();
    const issue = await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "coord-2" });
    expect(issue.status).toBe("ASSIGNED");
    expect(issue.assigneeId).toBe("coord-2");
    expect(issue.taskId).toBe("task-1");
    expect(createLinkedTask).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "coord-2", relatedEntityType: "MaintenanceIssue", relatedEntityId: "issue-1" }),
    );
  });

  it("denies a Coordinator without maintenance.assign/manage", async () => {
    const ctx = buildContext();
    const UNPRIVILEGED: AuthenticatedActor = { userId: "coord-9", role: "COORDINATOR", batchScope: [], permissions: [] };
    await expect(ctx.useCase.execute({ actor: UNPRIVILEGED, issueId: "issue-1", assigneeId: "coord-2" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Student from assigning", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: STUDENT, issueId: "issue-1", assigneeId: "coord-2" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("rejects assigning to a Student (assignee must be Secretary/Coordinator)", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "stu-1" })).rejects.toBeInstanceOf(
      InvalidMaintenanceAssigneeError,
    );
  });

  it("rejects assigning an issue that hasn't been acknowledged yet", async () => {
    const ctx = buildContext(record({ status: "SUBMITTED" }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1", assigneeId: "coord-2" })).rejects.toBeInstanceOf(
      InvalidMaintenanceIssueTransitionError,
    );
  });

  it("throws MaintenanceIssueNotFoundError for an unknown issue", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "unknown", assigneeId: "coord-2" })).rejects.toBeInstanceOf(
      MaintenanceIssueNotFoundError,
    );
  });

  it("allows a Coordinator with maintenance.assign to assign", async () => {
    const ctx = buildContext();
    const issue = await ctx.useCase.execute({ actor: COORDINATOR, issueId: "issue-1", assigneeId: "coord-2" });
    expect(issue.status).toBe("ASSIGNED");
  });
});
