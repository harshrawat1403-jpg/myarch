"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ProfileDraft } from "@/modules/profiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";

function statusBadgeVariant(status: ProfileDraft["status"]): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "CHANGES_REQUESTED") return "rejected";
  if (status === "PENDING_REVIEW") return "pending";
  return "neutral";
}

function formatDate(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * The review page half of the Approval Workspace (Milestone 11). All
 * business logic — the two API calls, the exact request bodies, the
 * redirect back to `/dashboard/approvals` on success, and hiding review
 * actions once a draft is no longer `PENDING_REVIEW` — is unchanged from
 * before; only presentation changed (verified by the existing
 * `review-draft-actions.test.tsx` suite passing unmodified). A "Back to
 * Approval Workspace" link and a submitted-date context line are the only
 * additions beyond restyling — both purely presentational.
 */
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
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/approvals"
          className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
          Back to Approval Workspace
        </Link>
        <p className="text-sm text-(--color-danger)">{error}</p>
      </div>
    );
  }

  if (!draft) {
    return <p className="text-sm text-(--color-text-secondary)">Loading submission…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/approvals"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Approval Workspace
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Review Submission
          </h1>
          {draft.submittedAt && (
            <p className="mt-1 text-sm text-(--color-text-secondary)">Submitted {formatDate(draft.submittedAt)}</p>
          )}
        </div>
        <Badge variant={statusBadgeVariant(draft.status)}>{draft.status.replace("_", " ")}</Badge>
      </div>

      {notice && <p className="text-sm text-(--color-success)">{notice}</p>}
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      <Card className="space-y-4">
        <div>
          <DataLabel>Bio</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-primary)">{draft.bio ?? "—"}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <DataLabel>Skills</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{draft.skills.join(", ") || "—"}</p>
          </div>
          <div>
            <DataLabel>Software</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{draft.software.join(", ") || "—"}</p>
          </div>
        </div>

        <div>
          <DataLabel>Portfolio Links</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-primary)">{draft.portfolioLinks.join(", ") || "—"}</p>
        </div>

        <div>
          <DataLabel>Selected Projects</DataLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-(--color-text-primary)">
            {draft.selectedProjects.map((project, index) => (
              <li key={index}>{project.title}</li>
            ))}
            {draft.selectedProjects.length === 0 && <li>—</li>}
          </ul>
        </div>

        {draft.reviewComment && (
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface-muted) p-3">
            <DataLabel>Previous Review Comment</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{draft.reviewComment}</p>
          </div>
        )}
      </Card>

      {draft.status === "PENDING_REVIEW" && (
        <Card className="space-y-4 border-t-2 border-t-(--color-accent)">
          <DataLabel>Reviewer Actions</DataLabel>

          <Button variant="primary" onClick={handleApprove}>
            Approve
          </Button>

          <div className="border-t border-(--color-border) pt-4">
            <Label htmlFor="review-comment">Or request changes</Label>
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
        </Card>
      )}
    </div>
  );
}
