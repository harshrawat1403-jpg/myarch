import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetMaintenanceDashboardStatsUseCase } from "../../../src/modules/maintenance/application/use-cases/get-dashboard-stats";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const MAINTENANCE_SECRETARY: AuthenticatedActor = {
  userId: "coord-mtsec",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_SECRETARY",
};
const VIEW_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: ["maintenance.view"] };
const REPORTS_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["maintenance.reports"] };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-3", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  const useCase = new GetMaintenanceDashboardStatsUseCase({ maintenanceIssueRepository });
  return { useCase };
}

describe("GetMaintenanceDashboardStatsUseCase", () => {
  it("allows Secretary and a Maintenance Secretary", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY })).resolves.toBeDefined();
    await expect(ctx.useCase.execute({ actor: MAINTENANCE_SECRETARY })).resolves.toBeDefined();
  });

  it("allows a Coordinator with the pre-existing maintenance.view grant — unchanged from before this amendment", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: VIEW_COORDINATOR })).resolves.toBeDefined();
  });

  it("allows a Coordinator granted the new maintenance.reports key", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: REPORTS_COORDINATOR })).resolves.toBeDefined();
  });

  it("denies an unprivileged Coordinator or a Student", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: UNPRIVILEGED_COORDINATOR })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(ctx.useCase.execute({ actor: STUDENT })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
