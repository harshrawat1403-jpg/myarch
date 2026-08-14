import type { AuthenticatedActor } from "@/modules/auth";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PaginatedResult,
  type TaskFilters,
  type TaskRecord,
  type TaskSort,
} from "../../domain/entities";
import type { TaskRepository } from "../ports/task-repository";

export interface SearchTasksInput {
  actor: AuthenticatedActor;
  filters?: TaskFilters;
  sort?: TaskSort;
  page?: number;
  pageSize?: number;
}

/**
 * Applies role-based scoping BEFORE the caller's own filters: Secretary is
 * unscoped; a Coordinator is forced to tasks they own or created
 * (`involvingUserId`); a Student is forced to `ownerId = self`, overriding
 * any client-supplied ownerId — a Student can never widen their own view by
 * passing a different owner in the query string. Recruiter/Alumni have no
 * task visibility at all (empty result, not an error — mirrors
 * canViewTask's own exhaustive role handling).
 */
export class SearchTasksUseCase {
  constructor(private readonly deps: { taskRepository: TaskRepository }) {}

  async execute(input: SearchTasksInput): Promise<PaginatedResult<TaskRecord>> {
    const requested = input.filters ?? {};
    let filters: TaskFilters;

    if (input.actor.role === "SECRETARY") {
      filters = requested;
    } else if (input.actor.role === "COORDINATOR") {
      filters = { ...requested, involvingUserId: input.actor.userId };
    } else if (input.actor.role === "STUDENT") {
      filters = { ...requested, ownerId: input.actor.userId, involvingUserId: undefined };
    } else {
      return { items: [], total: 0, page: input.page ?? 1, pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE };
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "createdAt", direction: "desc" };

    return this.deps.taskRepository.search(filters, sort, { page, pageSize });
  }
}
