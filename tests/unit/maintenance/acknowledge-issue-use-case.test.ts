import { beforeEach, describe, expect, it } from "vitest";
import { AcknowledgeMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/acknowledge-issue";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../../src/modules/maintenance";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function record(overrides: Partial<MaintenanceIssueRecord> = {}): MaintenanceIssueRecord {
  const now = new Date();
  return {
    id: "issue-1",
    category: "PLUMBING",
    location: "Lab 2",
    description: "Leaking tap",
    priority: "MEDIUM",
    status: "SUBMITTED",
    requesterId: "stu-1",
    publicReporterName: null,
    publicReporterEmail: null,
    assigneeId: null,
    deadline: null,
    taskId: null,
    resolutionDetails: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: MaintenanceIssueRecord = record()) {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  maintenanceIssueRepository.seed(seed);
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new AcknowledgeMaintenanceIssueUseCase({ maintenanceIssueRepository, auditRecorder });
  return { useCase };
}

describe("AcknowledgeMaintenanceIssueUseCase", () => {
  beforeEach(() => {});

  it("moves SUBMITTED to ACKNOWLEDGED and stamps acknowledgedAt", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1" });
    expect(updated.status).toBe("ACKNOWLEDGED");
    expect(updated.acknowledgedAt).not.toBeNull();
  });

  it("denies a Student", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: STUDENT, issueId: "issue-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects acknowledging an already-acknowledged issue", async () => {
    const ctx = buildContext(record({ status: "ACKNOWLEDGED" }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "issue-1" })).rejects.toBeInstanceOf(
      InvalidMaintenanceIssueTransitionError,
    );
  });

  it("throws MaintenanceIssueNotFoundError for an unknown issue", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, issueId: "unknown" })).rejects.toBeInstanceOf(
      MaintenanceIssueNotFoundError,
    );
  });
});
