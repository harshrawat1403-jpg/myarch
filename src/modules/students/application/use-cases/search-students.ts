import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentSearchFilters, StudentSearchResultItem } from "../../domain/entities";
import type { StudentRepository } from "../ports/student-repository";

export interface SearchStudentsInput {
  actor: AuthenticatedActor;
  filters: StudentSearchFilters;
}

/**
 * This is the department's internal admin directory (Secretary/Coordinator
 * only — enforced by role at the route, per docs/api/10_API_Architecture.md).
 * It is intentionally NOT the recruiter-facing directory (Days 8–9,
 * `03_Functional_Requirements.md` FR-RECRUIT), which will only ever query
 * approved StudentPublicProfile records through a completely separate path —
 * this use case must never be reused for that purpose, since its results
 * include CGPA.
 */
export class SearchStudentsUseCase {
  constructor(private readonly deps: { studentRepository: StudentRepository }) {}

  async execute(input: SearchStudentsInput): Promise<StudentSearchResultItem[]> {
    if (input.actor.role === "SECRETARY") {
      return this.deps.studentRepository.search(input.filters, {});
    }

    if (input.actor.role === "COORDINATOR") {
      const scope = input.actor.batchScope ?? [];

      if (input.filters.batchId && !scope.includes(input.filters.batchId)) {
        throw new NotAuthorizedError("This batch is outside your assigned scope");
      }

      if (scope.length === 0) return [];
      return this.deps.studentRepository.search(input.filters, { batchIds: scope });
    }

    // Student and Recruiter never reach this use case at all — the route is
    // role-gated to SECRETARY/COORDINATOR — but fail closed regardless.
    throw new NotAuthorizedError("Not authorized to search the student directory");
  }
}
