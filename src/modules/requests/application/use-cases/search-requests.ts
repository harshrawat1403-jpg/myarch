import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PaginatedResult,
  type RequestFilters,
  type RequestRecord,
  type RequestSort,
} from "../../domain/entities";
import type { RequestRepository } from "../ports/request-repository";

export interface SearchRequestsInput {
  actor: AuthenticatedActor;
  filters?: RequestFilters;
  sort?: RequestSort;
  page?: number;
  pageSize?: number;
}

/** Mirrors SearchMaintenanceIssuesUseCase exactly — role-based scoping applied before the caller's own filters. */
export class SearchRequestsUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository }) {}

  async execute(input: SearchRequestsInput): Promise<PaginatedResult<RequestRecord>> {
    const requested = input.filters ?? {};
    let filters: RequestFilters;

    if (input.actor.role === "SECRETARY") {
      filters = requested;
    } else if (input.actor.role === "COORDINATOR") {
      filters = hasCoordinatorPermission(input.actor, "requests.view")
        ? requested
        : { ...requested, ownerId: input.actor.userId };
    } else if (input.actor.role === "STUDENT") {
      filters = { ...requested, requesterId: input.actor.userId };
    } else {
      return { items: [], total: 0, page: input.page ?? 1, pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE };
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "createdAt", direction: "desc" };

    return this.deps.requestRepository.search(filters, sort, { page, pageSize });
  }
}
