import { beforeEach, describe, expect, it } from "vitest";
import { SearchMaintenanceIssuesUseCase } from "../../../src/modules/maintenance/application/use-cases/search-issues";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const VIEW_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: ["maintenance.view"] };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function record(overrides: Partial<MaintenanceIssueRecord>): MaintenanceIssueRecord {
  const now = new Date();
  return {
    id: overrides.id ?? "x",
    category: "ELECTRICAL",
    location: "Somewhere",
    description: "x",
    priority: "MEDIUM",
    status: "SUBMITTED",
    requesterId: "stu-1",
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

describe("SearchMaintenanceIssuesUseCase — role-based scoping (authorization)", () => {
  let repo: InMemoryMaintenanceIssueRepository;
  let useCase: SearchMaintenanceIssuesUseCase;

  beforeEach(() => {
    repo = new InMemoryMaintenanceIssueRepository();
    repo.seed(record({ id: "i1", requesterId: "stu-1", assigneeId: "coord-2" }));
    repo.seed(record({ id: "i2", requesterId: "stu-2", assigneeId: "coord-9" }));
    useCase = new SearchMaintenanceIssuesUseCase({ maintenanceIssueRepository: repo });
  });

  it("Secretary sees every issue", async () => {
    const result = await useCase.execute({ actor: SECRETARY });
    expect(result.total).toBe(2);
  });

  it("a Coordinator with maintenance.view sees every issue", async () => {
    const result = await useCase.execute({ actor: VIEW_COORDINATOR });
    expect(result.total).toBe(2);
  });

  it("an unprivileged Coordinator sees only issues assigned to them", async () => {
    const result = await useCase.execute({ actor: UNPRIVILEGED_COORDINATOR });
    expect(result.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("a Student sees only issues they reported, overriding any explicit requesterId filter", async () => {
    const result = await useCase.execute({ actor: STUDENT, filters: { requesterId: "stu-2" } });
    expect(result.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("a Recruiter gets an empty result, not an error", async () => {
    const result = await useCase.execute({ actor: RECRUITER });
    expect(result.total).toBe(0);
  });
});

describe("SearchMaintenanceIssuesUseCase — filtering and pagination", () => {
  it("filters by category and overdueOnly, and paginates correctly", async () => {
    const repo = new InMemoryMaintenanceIssueRepository();
    repo.seed(record({ id: "i1", category: "PLUMBING", status: "IN_PROGRESS", deadline: new Date(Date.now() - 60_000) }));
    repo.seed(record({ id: "i2", category: "ELECTRICAL", status: "IN_PROGRESS" }));
    for (let i = 0; i < 25; i++) repo.seed(record({ id: `bulk-${i}` }));
    const useCase = new SearchMaintenanceIssuesUseCase({ maintenanceIssueRepository: repo });

    const overdue = await useCase.execute({ actor: { userId: "sec-1", role: "SECRETARY" }, filters: { overdueOnly: true } });
    expect(overdue.items.map((i) => i.id)).toEqual(["i1"]);

    const paged = await useCase.execute({ actor: { userId: "sec-1", role: "SECRETARY" }, page: 2, pageSize: 10 });
    expect(paged.items).toHaveLength(10);
    expect(paged.total).toBe(27);
  });
});
