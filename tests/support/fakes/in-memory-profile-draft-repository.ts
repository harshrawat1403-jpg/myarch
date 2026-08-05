import crypto from "node:crypto";
import type {
  ApprovalQueueItem,
  ProfileContent,
  ProfileDraft,
  ProfileDraftStatus,
} from "../../../src/modules/profiles/domain/entities";
import type { ProfileDraftRepository } from "../../../src/modules/profiles/application/ports/profile-draft-repository";

const EMPTY_CONTENT: ProfileContent = {
  bio: null,
  skills: [],
  software: [],
  selectedProjects: [],
  portfolioLinks: [],
  resumeFileId: null,
  certifications: [],
  internships: [],
};

interface SeededStudentInfo {
  fullName: string;
  batchId: string;
}

export class InMemoryProfileDraftRepository implements ProfileDraftRepository {
  private readonly byId = new Map<string, ProfileDraft>();
  private readonly byStudentId = new Map<string, string>();
  private readonly studentInfo = new Map<string, SeededStudentInfo>();

  /** Test helper so listPendingReview() can join against student identity. */
  seedStudentInfo(studentProfileId: string, info: SeededStudentInfo): void {
    this.studentInfo.set(studentProfileId, info);
  }

  async findByStudentId(studentProfileId: string): Promise<ProfileDraft | null> {
    const id = this.byStudentId.get(studentProfileId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async findById(draftId: string): Promise<ProfileDraft | null> {
    return this.byId.get(draftId) ?? null;
  }

  async create(studentProfileId: string): Promise<ProfileDraft> {
    const now = new Date();
    const draft: ProfileDraft = {
      id: crypto.randomUUID(),
      studentProfileId,
      ...EMPTY_CONTENT,
      status: "DRAFT",
      submittedAt: null,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(draft.id, draft);
    this.byStudentId.set(studentProfileId, draft.id);
    return draft;
  }

  async updateContent(
    draftId: string,
    content: Partial<ProfileContent>,
    status: ProfileDraftStatus,
  ): Promise<ProfileDraft> {
    const existing = this.byId.get(draftId);
    if (!existing) throw new Error("not found");
    const updated: ProfileDraft = { ...existing, ...content, status, updatedAt: new Date() };
    this.byId.set(draftId, updated);
    return updated;
  }

  async transitionStatus(
    draftId: string,
    data: {
      status: ProfileDraftStatus;
      submittedAt?: Date | null;
      reviewedByUserId?: string | null;
      reviewedAt?: Date | null;
      reviewComment?: string | null;
    },
  ): Promise<ProfileDraft> {
    const existing = this.byId.get(draftId);
    if (!existing) throw new Error("not found");
    const updated: ProfileDraft = {
      ...existing,
      status: data.status,
      submittedAt: data.submittedAt !== undefined ? data.submittedAt : existing.submittedAt,
      reviewedByUserId:
        data.reviewedByUserId !== undefined ? data.reviewedByUserId : existing.reviewedByUserId,
      reviewedAt: data.reviewedAt !== undefined ? data.reviewedAt : existing.reviewedAt,
      reviewComment: data.reviewComment !== undefined ? data.reviewComment : existing.reviewComment,
      updatedAt: new Date(),
    };
    this.byId.set(draftId, updated);
    return updated;
  }

  async listPendingReview(scope: { batchIds?: readonly string[] }): Promise<ApprovalQueueItem[]> {
    const scopeSet = scope.batchIds ? new Set(scope.batchIds) : undefined;
    return [...this.byId.values()]
      .filter((d) => d.status === "PENDING_REVIEW")
      .filter((d) => {
        if (!scopeSet) return true;
        const info = this.studentInfo.get(d.studentProfileId);
        return info ? scopeSet.has(info.batchId) : false;
      })
      .map((d) => ({
        draftId: d.id,
        studentProfileId: d.studentProfileId,
        studentFullName: this.studentInfo.get(d.studentProfileId)?.fullName ?? "Unknown",
        batchId: this.studentInfo.get(d.studentProfileId)?.batchId ?? "unknown-batch",
        submittedAt: d.submittedAt,
      }));
  }
}
