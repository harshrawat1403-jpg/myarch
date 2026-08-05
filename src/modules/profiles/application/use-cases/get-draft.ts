import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPublicProfileDraft } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { StudentNotFoundError } from "@/modules/students";
import type { ProfileDraft } from "../../domain/entities";
import { DraftNotFoundError } from "../../domain/errors";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface GetDraftInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * Viewing eligibility reuses `canEditPublicProfileDraft` (Secretary any,
 * Coordinator in-scope, Student own) rather than a new permission function —
 * anyone who may edit a draft may certainly view it, and that is exactly the
 * set of roles this endpoint should ever expose a draft to. Recruiters are
 * never in that set, satisfying "Recruiters must never see drafts."
 */
export class GetDraftUseCase {
  constructor(
    private readonly deps: {
      profileDraftRepository: ProfileDraftRepository;
      studentLookup: StudentLookup;
    },
  ) {}

  async execute(input: GetDraftInput): Promise<ProfileDraft> {
    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canEditPublicProfileDraft(input.actor, student.batchId, student.id)) {
      throw new NotAuthorizedError("Not authorized to view this student's profile draft");
    }

    const draft = await this.deps.profileDraftRepository.findByStudentId(input.studentId);
    if (!draft) {
      throw new DraftNotFoundError();
    }

    return draft;
  }
}
