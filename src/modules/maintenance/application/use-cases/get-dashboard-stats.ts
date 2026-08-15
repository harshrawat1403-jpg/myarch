import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canViewMaintenanceReports } from "../../domain/permissions";
import type { DashboardStats, MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface GetMaintenanceDashboardStatsInput {
  actor: AuthenticatedActor;
}

/** §3.9 — staff-only (Secretary, Maintenance Secretary, or a Coordinator delegated view/reports/manage visibility). */
export class GetMaintenanceDashboardStatsUseCase {
  constructor(private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository }) {}

  async execute(input: GetMaintenanceDashboardStatsInput): Promise<DashboardStats> {
    if (!canViewMaintenanceReports(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view the maintenance dashboard");
    }

    return this.deps.maintenanceIssueRepository.getDashboardStats();
  }
}
