import type { AuthenticatedActor } from "@/modules/auth";
import { canApprovePublicProfile } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import { StudentNotFoundError } from "@/modules/students";
import type { ProfileContent, PublishedProfile } from "../../domain/entities";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../domain/errors";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";
import type { PublishedProfileRepository } from "../ports/published-profile-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface ApproveDraftInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * Approval is the ONLY path that ever writes StudentPublicProfile — the
 * publish step here copies exactly the ProfileContent fields (bio, skills,
 * software, selectedProjects, portfolioLinks, resumeFileId, certifications,
 * internships) and nothing else. There is no code path, here or anywhere
 * else in this module, that reads from StudentPrivateProfile — the
 * `content` object passed to `publish()` is built from the draft's own
 * fields alone, so a private field cannot leak during publication even by
 * accident (docs/security/09_User_Roles_and_Permissions.md).
 */
export class ApproveDraftUseCase {
  constructor(
    private readonly deps: {
      profileDraftRepository: ProfileDraftRepository;
      publishedProfileRepository: PublishedProfileRepository;
      studentLookup: StudentLookup;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: ApproveDraftInput): Promise<PublishedProfile> {
    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canApprovePublicProfile(input.actor)) {
      throw new NotAuthorizedError("Not authorized to approve this student's profile draft");
    }

    const draft = await this.deps.profileDraftRepository.findByStudentId(input.studentId);
    if (!draft) {
      throw new DraftNotFoundError();
    }

    if (draft.status !== "PENDING_REVIEW") {
      throw new InvalidDraftTransitionError(draft.status, "approve");
    }

    const now = new Date();
    await this.deps.profileDraftRepository.transitionStatus(draft.id, {
      status: "APPROVED",
      reviewedByUserId: input.actor.userId,
      reviewedAt: now,
      reviewComment: null,
    });

    const content: ProfileContent = {
      bio: draft.bio,
      skills: draft.skills,
      software: draft.software,
      selectedProjects: draft.selectedProjects,
      portfolioLinks: draft.portfolioLinks,
      resumeFileId: draft.resumeFileId,
      certifications: draft.certifications,
      internships: draft.internships,
    };

    const published = await this.deps.publishedProfileRepository.publish({
      studentProfileId: input.studentId,
      content,
      publishedFromDraftId: draft.id,
      publishedByUserId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: "PROFILE_APPROVED",
      targetEntityType: "StudentPublicProfileDraft",
      targetEntityId: draft.id,
      metadata: { studentProfileId: input.studentId, publishedProfileId: published.id },
    });

    // Fire-and-forget from this use case's perspective: notify() never
    // rejects (NFR-AVAIL-03), so a degraded email provider can never turn a
    // successful approval into a failed request.
    await this.deps.notificationService.notify({
      recipientUserId: student.userId,
      template: "PROFILE_APPROVED",
      context: { studentName: student.fullName },
    });

    return published;
  }
}
