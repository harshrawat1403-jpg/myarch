"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ProfileDraft } from "@/modules/profiles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

function statusBadgeVariant(status: ProfileDraft["status"]): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "CHANGES_REQUESTED") return "rejected";
  if (status === "PENDING_REVIEW") return "pending";
  return "neutral";
}

export default function ReviewDraftPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    if (!accessToken) return;
    try {
      const record = await apiClient.get<ProfileDraft>(`/api/students/${studentId}/profile/draft`, accessToken);
      setDraft(record);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this submission.");
    }
  }

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves — a
    // standard fetch-on-mount effect (see students/page.tsx for the same
    // justification).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, studentId]);

  async function handleApprove() {
    if (!accessToken) return;
    try {
      await apiClient.post(`/api/students/${studentId}/profile/draft/approve`, undefined, accessToken);
      setNotice("Profile approved and published.");
      router.push("/dashboard/approvals");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to approve this submission.");
    }
  }

  async function handleRequestChanges() {
    if (!accessToken || !reviewComment.trim()) return;
    try {
      await apiClient.post(
        `/api/students/${studentId}/profile/draft/request-changes`,
        { reviewComment },
        accessToken,
      );
      setNotice("Changes requested.");
      router.push("/dashboard/approvals");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to request changes.");
    }
  }

  if (error && !draft) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!draft) {
    return <p className="text-sm text-[--color-text-secondary]">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
          Review Submission
        </h1>
        <Badge variant={statusBadgeVariant(draft.status)}>{draft.status.replace("_", " ")}</Badge>
      </div>

      {notice && <p className="text-sm text-[--color-accent]">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-4 rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Bio</p>
          <p className="text-sm text-[--color-text-primary]">{draft.bio ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Skills</p>
          <p className="text-sm text-[--color-text-primary]">{draft.skills.join(", ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Software</p>
          <p className="text-sm text-[--color-text-primary]">{draft.software.join(", ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Portfolio Links</p>
          <p className="text-sm text-[--color-text-primary]">{draft.portfolioLinks.join(", ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Selected Projects</p>
          <ul className="list-inside list-disc text-sm text-[--color-text-primary]">
            {draft.selectedProjects.map((project, index) => (
              <li key={index}>{project.title}</li>
            ))}
            {draft.selectedProjects.length === 0 && <li>—</li>}
          </ul>
        </div>
        {draft.reviewComment && (
          <div>
            <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Previous Review Comment</p>
            <p className="text-sm text-[--color-text-primary]">{draft.reviewComment}</p>
          </div>
        )}
      </div>

      {draft.status === "PENDING_REVIEW" && (
        <div className="space-y-3 rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
          <Button variant="primary" onClick={handleApprove}>
            Approve
          </Button>

          <div>
            <Label htmlFor="review-comment">Review comment</Label>
            <Textarea
              id="review-comment"
              placeholder="Describe what needs to change…"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
            <Button variant="destructive" className="mt-2" onClick={handleRequestChanges} disabled={!reviewComment.trim()}>
              Request Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
