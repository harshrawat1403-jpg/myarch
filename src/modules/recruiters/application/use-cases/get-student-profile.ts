import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterStudentProfileDTO } from "../../domain/entities";
import { ApprovedProfileNotFoundError } from "../../domain/errors";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import { mergeInteractionState } from "./merge-interaction-state";
import { mergeInterestState } from "./merge-interest-state";

export interface GetRecruiterStudentProfileInput {
  actor: AuthenticatedActor;
  studentId: string;
}

export class GetRecruiterStudentProfileUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interactionRepository: RecruiterInteractionRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(input: GetRecruiterStudentProfileInput): Promise<RecruiterStudentProfileDTO> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view this profile");
    }

    const profile = await this.deps.directoryRepository.findByStudentId(input.studentId);
    if (!profile) {
      // Deliberately the same "not found" whether the student doesn't
      // exist, has never been approved, or is currently a draft/pending/
      // changes-requested/archived — a Recruiter never gets a signal that
      // distinguishes "no such student" from "this student exists but you
      // can't see them yet" (docs/api/10_API_Architecture.md's 404-vs-403
      // guidance, applied here since revealing draft-in-progress existence
      // would itself be a privacy leak).
      throw new ApprovedProfileNotFoundError();
    }

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(input.actor.userId);
    if (!recruiter) return profile;

    const [interaction, interest] = await Promise.all([
      this.deps.interactionRepository.findOneForRecruiter(recruiter.id, profile.studentId),
      this.deps.interestRepository.findByRecruiterAndStudent(recruiter.id, profile.studentId),
    ]);
    const withInteraction = mergeInteractionState([profile], interaction ? [interaction] : []);
    return mergeInterestState(withInteraction, interest ? [interest] : [])[0]!;
  }
}
