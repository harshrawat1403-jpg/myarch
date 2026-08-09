import type { AuthenticatedActor } from "@/modules/auth";
import { canRequestProfileChanges } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import { StudentNotFoundError } from "@/modules/students";
import type { ProfileDraft } from "../../domain/entities";
import {
  DraftNotFoundError,
  InvalidDraftTransitionError,
  MissingReviewCommentError,
} from "../../domain/errors";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface RequestChangesInput {
  actor: AuthenticatedActor;
  studentId: string;
  reviewComment: string;
}

/**
 * Returns the draft to the student while preserving the reviewer's comment
 * on the draft itself (`reviewComment`, visible to the student) — the
 * decision is also independently, permanently recorded in the AuditLog via
 * `PROFILE_CHANGES_REQUESTED`, satisfying "audit all approval decisions"
 * even though this one isn't an approval.
 */
export class RequestChangesUseCase {
  constructor(
    private readonly deps: {
      profileDraftRepository: ProfileDraftRepository;
      studentLookup: StudentLookup;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: RequestChangesInput): Promise<ProfileDraft> {
    if (!input.reviewComment.trim()) {
      throw new MissingReviewCommentError();
    }

    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canRequestProfileChanges(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to review this student's profile draft");
    }

    const draft = await this.deps.profileDraftRepository.findByStudentId(input.studentId);
    if (!draft) {
      throw new DraftNotFoundError();
    }

    if (draft.status !== "PENDING_REVIEW") {
      throw new InvalidDraftTransitionError(draft.status, "request changes on");
    }

    const updated = await this.deps.profileDraftRepository.transitionStatus(draft.id, {
      status: "CHANGES_REQUESTED",
      reviewedByUserId: input.actor.userId,
      reviewedAt: new Date(),
      reviewComment: input.reviewComment,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: "PROFILE_CHANGES_REQUESTED",
      targetEntityType: "StudentPublicProfileDraft",
      targetEntityId: draft.id,
      metadata: { studentProfileId: input.studentId, reviewComment: input.reviewComment },
    });

    await this.deps.notificationService.notify({
      recipientUserId: student.userId,
      template: "PROFILE_CHANGES_REQUESTED",
      context: { studentName: student.fullName, reviewComment: input.reviewComment },
    });

    return updated;
  }
}
