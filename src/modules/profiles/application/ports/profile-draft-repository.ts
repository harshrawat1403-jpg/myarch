import type {
  ApprovalQueueItem,
  ProfileContent,
  ProfileDraft,
  ProfileDraftStatus,
} from "../../domain/entities";

export interface ProfileDraftRepository {
  findByStudentId(studentProfileId: string): Promise<ProfileDraft | null>;
  findById(draftId: string): Promise<ProfileDraft | null>;

  /** Creates the initial (empty, DRAFT-status) draft row for a student — lazily, on first edit. */
  create(studentProfileId: string): Promise<ProfileDraft>;

  /** Updates content fields and sets the resulting status in one write — the status is decided by the use case, not the repository. */
  updateContent(
    draftId: string,
    content: Partial<ProfileContent>,
    status: ProfileDraftStatus,
  ): Promise<ProfileDraft>;

  /** State-only transition (submit / approve / request changes) — no content change. */
  transitionStatus(
    draftId: string,
    data: {
      status: ProfileDraftStatus;
      submittedAt?: Date | null;
      reviewedByUserId?: string | null;
      reviewedAt?: Date | null;
      reviewComment?: string | null;
    },
  ): Promise<ProfileDraft>;

  /** The approval queue — restricted to `batchIds` when provided (a Coordinator's scope). */
  listPendingReview(scope: { batchIds?: readonly string[] }): Promise<ApprovalQueueItem[]>;
}
