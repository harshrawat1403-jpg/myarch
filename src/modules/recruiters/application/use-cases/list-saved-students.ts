import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterStudentProfileDTO } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import { mergeInteractionState } from "./merge-interaction-state";
import { mergeInterestState } from "./merge-interest-state";

/** V4.0 C4 — /recruiter/saved. Shortlisted is a filtered view of this same list, never a separate route (§8, §23 — Q3). */
export class ListSavedStudentsUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interactionRepository: RecruiterInteractionRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(actor: AuthenticatedActor): Promise<RecruiterStudentProfileDTO[]> {
    if (!canAccessRecruiterDirectory(actor)) {
      throw new NotAuthorizedError("Not authorized to view saved students");
    }

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(actor.userId);
    if (!recruiter) return [];

    const interactions = await this.deps.interactionRepository.listSavedForRecruiter(recruiter.id);
    const studentIds = interactions.map((i) => i.studentProfileId);
    if (studentIds.length === 0) return [];

    const [profiles, interests] = await Promise.all([
      this.deps.directoryRepository.findManyByIds(studentIds),
      this.deps.interestRepository.findManyForRecruiter(recruiter.id, studentIds),
    ]);

    return mergeInterestState(mergeInteractionState(profiles, interactions), interests);
  }
}
