import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import { NotAuthorizedError } from "@/lib/errors";
import type { DashboardStats, MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface GetMaintenanceDashboardStatsInput {
  actor: AuthenticatedActor;
}

/** §3.9 — staff-only (Secretary, or a Coordinator delegated view/manage visibility). */
export class GetMaintenanceDashboardStatsUseCase {
  constructor(private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository }) {}

  async execute(input: GetMaintenanceDashboardStatsInput): Promise<DashboardStats> {
    const authorized =
      input.actor.role === "SECRETARY" ||
      (input.actor.role === "COORDINATOR" &&
        (hasCoordinatorPermission(input.actor, "maintenance.view") ||
          hasCoordinatorPermission(input.actor, "maintenance.manage")));
    if (!authorized) {
      throw new NotAuthorizedError("Not authorized to view the maintenance dashboard");
    }

    return this.deps.maintenanceIssueRepository.getDashboardStats();
  }
}
