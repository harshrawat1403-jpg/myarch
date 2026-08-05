import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPublicProfileDraft } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { StudentNotFoundError } from "@/modules/students";
import type { ProfileContent, ProfileDraft } from "../../domain/entities";
import { DraftLockedForReviewError } from "../../domain/errors";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface SaveDraftInput {
  actor: AuthenticatedActor;
  studentId: string;
  content: Partial<ProfileContent>;
}

/**
 * "Allow students to edit only the draft" — this use case is deliberately
 * restricted to the OWNING student (not Secretary/Coordinator on their
 * behalf); admins review, they don't co-author content.
 *
 * Status transitions on edit (docs/planning's Days 5–6 state machine):
 *   (no draft yet)     -> create + DRAFT
 *   DRAFT              -> stays DRAFT
 *   CHANGES_REQUESTED  -> stays CHANGES_REQUESTED (iterative fixes before resubmitting)
 *   APPROVED           -> resets to DRAFT (an edit after publication starts a new, unreviewed cycle)
 *   PENDING_REVIEW      -> blocked (DraftLockedForReviewError) — locked while a reviewer has it
 */
export class SaveDraftUseCase {
  constructor(
    private readonly deps: {
      profileDraftRepository: ProfileDraftRepository;
      studentLookup: StudentLookup;
    },
  ) {}

  async execute(input: SaveDraftInput): Promise<ProfileDraft> {
    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canEditPublicProfileDraft(input.actor, student.batchId, student.id)) {
      throw new NotAuthorizedError("Not authorized to edit this student's profile draft");
    }
    if (input.actor.role !== "STUDENT") {
      // canEditPublicProfileDraft also allows Secretary/Coordinator, but this
      // specific action (content editing) is student-only by requirement —
      // re-checked here rather than widening the shared permission function.
      throw new NotAuthorizedError("Only the student may edit their own profile draft");
    }

    const existing = await this.deps.profileDraftRepository.findByStudentId(input.studentId);

    if (!existing) {
      const created = await this.deps.profileDraftRepository.create(input.studentId);
      return this.deps.profileDraftRepository.updateContent(created.id, input.content, "DRAFT");
    }

    if (existing.status === "PENDING_REVIEW") {
      throw new DraftLockedForReviewError();
    }

    const nextStatus = existing.status === "APPROVED" ? "DRAFT" : existing.status;
    return this.deps.profileDraftRepository.updateContent(existing.id, input.content, nextStatus);
  }
}
