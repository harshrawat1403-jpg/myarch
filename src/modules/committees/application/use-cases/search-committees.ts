import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CommitteeFilters,
  type CommitteeRecord,
  type CommitteeSort,
  type PaginatedResult,
} from "../../domain/entities";
import { canViewCommittee } from "../../domain/permissions";
import type { CommitteeRepository } from "../ports/committee-repository";

export interface SearchCommitteesInput {
  actor: AuthenticatedActor;
  filters?: CommitteeFilters;
  sort?: CommitteeSort;
  page?: number;
  pageSize?: number;
}

/** Unlike Meetings, a Committee has no per-row privacy scoping — canViewCommittee is a single role check (everyone but RECRUITER), so every filter is applied unrestricted once that check passes. */
export class SearchCommitteesUseCase {
  constructor(private readonly deps: { committeeRepository: CommitteeRepository }) {}

  async execute(input: SearchCommitteesInput): Promise<PaginatedResult<CommitteeRecord>> {
    if (!canViewCommittee(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view committees");
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "name", direction: "asc" };

    return this.deps.committeeRepository.search(input.filters ?? {}, sort, { page, pageSize });
  }
}
