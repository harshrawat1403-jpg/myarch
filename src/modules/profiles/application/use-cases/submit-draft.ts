import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AuditRecorder } from "@/lib/audit";
import type { ProfileDraft } from "../../domain/entities";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../domain/errors";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";

export interface SubmitDraftInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * "Submitted" is a transient action, not a stored status (see
 * domain/entities.ts) — it moves DRAFT or CHANGES_REQUESTED into
 * PENDING_REVIEW. The previous review comment is cleared here: a fresh
 * submission starts a new review cycle, and the AuditLog (not this live
 * field) is the permanent record of what was said in the prior round.
 */
export class SubmitDraftUseCase {
  constructor(
    private readonly deps: {
      profileDraftRepository: ProfileDraftRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: SubmitDraftInput): Promise<ProfileDraft> {
    const draft = await this.deps.profileDraftRepository.findByStudentId(input.studentId);
    if (!draft) {
      throw new DraftNotFoundError();
    }

    if (input.actor.role !== "STUDENT" || input.actor.studentProfileId !== input.studentId) {
      throw new NotAuthorizedError("Only the student may submit their own profile draft");
    }

    if (draft.status !== "DRAFT" && draft.status !== "CHANGES_REQUESTED") {
      throw new InvalidDraftTransitionError(draft.status, "submit");
    }

    const updated = await this.deps.profileDraftRepository.transitionStatus(draft.id, {
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      reviewedByUserId: null,
      reviewedAt: null,
      reviewComment: null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: "PROFILE_DRAFT_SUBMITTED",
      targetEntityType: "StudentPublicProfileDraft",
      targetEntityId: draft.id,
    });

    return updated;
  }
}
