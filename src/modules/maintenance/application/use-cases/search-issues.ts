import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type MaintenanceIssueFilters,
  type MaintenanceIssueRecord,
  type MaintenanceIssueSort,
  type PaginatedResult,
} from "../../domain/entities";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface SearchMaintenanceIssuesInput {
  actor: AuthenticatedActor;
  filters?: MaintenanceIssueFilters;
  sort?: MaintenanceIssueSort;
  page?: number;
  pageSize?: number;
}

/**
 * Role-based scoping applied BEFORE the caller's own filters — mirrors
 * SearchTasksUseCase exactly. Secretary unscoped; a Coordinator with
 * `maintenance.view` unscoped, otherwise forced to `assigneeId = self`; a
 * Student forced to `requesterId = self`, overriding any client-supplied
 * requesterId ("cannot access other students' private records").
 */
export class SearchMaintenanceIssuesUseCase {
  constructor(private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository }) {}

  async execute(input: SearchMaintenanceIssuesInput): Promise<PaginatedResult<MaintenanceIssueRecord>> {
    const requested = input.filters ?? {};
    let filters: MaintenanceIssueFilters;

    if (input.actor.role === "SECRETARY") {
      filters = requested;
    } else if (input.actor.role === "COORDINATOR") {
      filters = hasCoordinatorPermission(input.actor, "maintenance.view")
        ? requested
        : { ...requested, assigneeId: input.actor.userId };
    } else if (input.actor.role === "STUDENT") {
      filters = { ...requested, requesterId: input.actor.userId };
    } else {
      return { items: [], total: 0, page: input.page ?? 1, pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE };
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "createdAt", direction: "desc" };

    return this.deps.maintenanceIssueRepository.search(filters, sort, { page, pageSize });
  }
}
