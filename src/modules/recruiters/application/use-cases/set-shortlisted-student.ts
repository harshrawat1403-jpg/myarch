import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterInteractionRecord, RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import { RecruiterProfileNotFoundError, StudentNotSavedError } from "../../domain/errors";

export interface SetShortlistedStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
  isShortlisted: boolean;
}

/** One tap — promotes an already-saved student (§8 step 3). Still the same interaction row, no separate table/route. */
export class SetShortlistedStudentUseCase {
  constructor(
    private readonly deps: { interactionRepository: RecruiterInteractionRepository; recruiterSelfLookup: RecruiterSelfLookup },
  ) {}

  async execute(input: SetShortlistedStudentInput): Promise<RecruiterInteractionRecord> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to shortlist students");
    }

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(input.actor.userId);
    if (!recruiter) throw new RecruiterProfileNotFoundError();

    if (input.isShortlisted) {
      const existing = await this.deps.interactionRepository.findOneForRecruiter(recruiter.id, input.studentId);
      if (!existing?.isSaved) throw new StudentNotSavedError();
    }

    return this.deps.interactionRepository.setShortlisted(recruiter.id, input.studentId, input.isShortlisted);
  }
}
