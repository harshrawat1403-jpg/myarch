import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterInteractionRecord, RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import { ApprovedProfileNotFoundError, RecruiterProfileNotFoundError } from "../../domain/errors";

export interface SetSavedStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
  saved: boolean;
}

/** One tap, private, toggles RecruiterStudentInteraction.savedAt (§8 step 2). No form, no confirmation. */
export class SetSavedStudentUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interactionRepository: RecruiterInteractionRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(input: SetSavedStudentInput): Promise<RecruiterInteractionRecord> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to save students");
    }

    // Same 404-not-403 discipline GetRecruiterStudentProfileUseCase uses —
    // a recruiter can only ever save a student they can already see.
    const profile = await this.deps.directoryRepository.findByStudentId(input.studentId);
    if (!profile) throw new ApprovedProfileNotFoundError();

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(input.actor.userId);
    if (!recruiter) throw new RecruiterProfileNotFoundError();

    return this.deps.interactionRepository.setSaved(recruiter.id, input.studentId, input.saved);
  }
}
