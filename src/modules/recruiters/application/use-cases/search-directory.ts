import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterSearchFilters, RecruiterStudentProfileDTO } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import { mergeInteractionState } from "./merge-interaction-state";
import { mergeInterestState } from "./merge-interest-state";

export interface SearchDirectoryInput {
  actor: AuthenticatedActor;
  filters: RecruiterSearchFilters;
}

export class SearchDirectoryUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interactionRepository: RecruiterInteractionRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(input: SearchDirectoryInput): Promise<RecruiterStudentProfileDTO[]> {
    // Defense in depth alongside the route's withAuth({ roles: ["RECRUITER"] })
    // gate — reuses the same centralized function every other module's
    // profile-viewing paths use, per "continue using centralized authorization."
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to browse the recruiter directory");
    }

    const results = await this.deps.directoryRepository.search(input.filters);

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(input.actor.userId);
    if (!recruiter) return results;

    const studentIds = results.map((r) => r.studentId);
    const [interactions, interests] = await Promise.all([
      this.deps.interactionRepository.findManyForRecruiter(recruiter.id, studentIds),
      this.deps.interestRepository.findManyForRecruiter(recruiter.id, studentIds),
    ]);
    return mergeInterestState(mergeInteractionState(results, interactions), interests);
  }
}
