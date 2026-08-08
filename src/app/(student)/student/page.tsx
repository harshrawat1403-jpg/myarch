"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Globe, Lock, Target } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ProfileDraft, PublishedProfile } from "@/modules/profiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { DashboardPanel } from "@/components/dashboard-panel";

function statusBadgeVariant(status: ProfileDraft["status"]): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "CHANGES_REQUESTED") return "rejected";
  if (status === "PENDING_REVIEW") return "pending";
  return "neutral";
}

function statusLabel(status: ProfileDraft["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_REVIEW":
      return "Pending Review";
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes Requested";
  }
}

/** Purely presentational — no gating, no validation change. What a student should do next, derived only from the status already on screen. */
function nextActionGuidance(status: ProfileDraft["status"] | undefined): string {
  switch (status) {
    case undefined:
      return "You haven't started your profile yet — fill in the fields below and save your first draft.";
    case "DRAFT":
      return "Add as much detail as you can, then submit when you're ready for review.";
    case "PENDING_REVIEW":
      return "Your draft is with a reviewer — check back soon.";
    case "CHANGES_REQUESTED":
      return "Update your draft based on the feedback below, then resubmit.";
    case "APPROVED":
      return "Your profile is approved and visible to recruiters.";
  }
}

function joinList(values: readonly string[]): string {
  return values.join(", ");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * The student self-service surface: view/edit the own public profile draft,
 * submit it for review, and see the published profile once approved. Reuses
 * the existing, already-tested profiles API exactly as the admin approval
 * pages do (GET/PUT draft, POST submit, GET published) — no business logic
 * here, only wiring an existing endpoint set to a UI for the one role that
 * never had one (docs/CHANGELOG.md: "Student self-service isn't built yet").
 *
 * Milestone 12: presentation only. Every fetch call, request body, status
 * gate (`isLocked`/`canSubmit`), and button label is byte-for-byte
 * unchanged from the version this replaces — confirmed by the pre-existing
 * `student-profile-page.test.tsx` suite passing unmodified. "Profile
 * completion" is a derived count over the four fields this form actually
 * lets a student edit (bio/skills/software/portfolio links) — the other
 * `ProfileContent` fields (selected projects, certifications, internships)
 * have no edit UI on this page, so counting them would flag a student as
 * "incomplete" for something they have no way to fill in here.
 */
export default function StudentProfilePage() {
  const { accessToken, studentProfileId } = useAuth();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [published, setPublished] = useState<PublishedProfile | null>(null);
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [software, setSoftware] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !studentProfileId) return;
    let cancelled = false;

    (async () => {
      try {
        const loaded = await apiClient.get<ProfileDraft>(
          `/api/students/${studentProfileId}/profile/draft`,
          accessToken,
        );
        if (cancelled) return;
        setDraft(loaded);
        setBio(loaded.bio ?? "");
        setSkills(joinList(loaded.skills));
        setSoftware(joinList(loaded.software));
        setPortfolioLinks(joinList(loaded.portfolioLinks));
      } catch (err) {
        // No draft yet is expected for a brand-new student — the form below
        // just starts empty, and the first Save creates one.
        if (!cancelled && !(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : "Unable to load your profile draft.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      try {
        const publishedProfile = await apiClient.get<PublishedProfile>(
          `/api/students/${studentProfileId}/profile/published`,
          accessToken,
        );
        if (!cancelled) setPublished(publishedProfile);
      } catch {
        // Not yet published — the published-profile section below simply doesn't render.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, studentProfileId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !studentProfileId) return;
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const updated = await apiClient.put<ProfileDraft>(
        `/api/students/${studentProfileId}/profile/draft`,
        {
          bio: bio.trim() || null,
          skills: splitList(skills),
          software: splitList(software),
          portfolioLinks: splitList(portfolioLinks),
        },
        accessToken,
      );
      setDraft(updated);
      setMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!accessToken || !studentProfileId) return;
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const updated = await apiClient.post<ProfileDraft>(
        `/api/students/${studentProfileId}/profile/draft/submit`,
        undefined,
        accessToken,
      );
      setDraft(updated);
      setMessage("Submitted for review.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit your draft.");
    } finally {
      setIsSaving(false);
    }
  }

  const isLocked = draft?.status === "PENDING_REVIEW";
  const canSubmit = draft?.status === "DRAFT" || draft?.status === "CHANGES_REQUESTED";

  const completionChecks = [Boolean(bio.trim()), splitList(skills).length > 0, splitList(software).length > 0, splitList(portfolioLinks).length > 0];
  const completedCount = completionChecks.filter(Boolean).length;
  const completionPercent = Math.round((completedCount / completionChecks.length) * 100);

  if (isLoading) {
    return <p className="text-sm text-(--color-text-secondary)">Loading your profile…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <DataLabel>My Profile</DataLabel>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Public Profile Draft
          </h1>
          {draft && <Badge variant={statusBadgeVariant(draft.status)}>{statusLabel(draft.status)}</Badge>}
        </div>
        <p className="mt-2 text-sm text-(--color-text-secondary)">{nextActionGuidance(draft?.status)}</p>
      </div>

      <DashboardPanel title="Profile Completion" icon={Target}>
        <div className="flex items-center justify-between gap-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-surface-muted)">
            <div
              className="h-full rounded-full bg-(--color-accent) transition-all duration-200"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-medium text-(--color-text-secondary)">
            {completedCount} of {completionChecks.length}
          </span>
        </div>
        <p className="mt-2 text-xs text-(--color-text-secondary)">Based on bio, skills, software, and portfolio links.</p>
      </DashboardPanel>

      {draft?.status === "CHANGES_REQUESTED" && draft.reviewComment && (
        <div className="flex gap-3 rounded-lg border border-(--color-danger)/30 bg-(--color-danger-soft) p-4">
          <AlertCircle aria-hidden="true" size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-(--color-danger)" />
          <div>
            <DataLabel className="text-(--color-danger)">Reviewer Comment</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{draft.reviewComment}</p>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-(--color-warning)/30 bg-(--color-warning-soft) p-4">
          <Lock aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0 text-(--color-warning)" />
          <p className="text-sm text-(--color-text-primary)">
            Your draft is locked while a reviewer is considering it — you can&apos;t edit it until they respond.
          </p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} disabled={isLocked} />
          </div>
          <div>
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={isLocked} />
          </div>
          <div>
            <Label htmlFor="software">Software (comma-separated)</Label>
            <Input id="software" value={software} onChange={(e) => setSoftware(e.target.value)} disabled={isLocked} />
          </div>
          <div>
            <Label htmlFor="portfolioLinks">Portfolio links (comma-separated URLs)</Label>
            <Input
              id="portfolioLinks"
              value={portfolioLinks}
              onChange={(e) => setPortfolioLinks(e.target.value)}
              disabled={isLocked}
            />
          </div>

          <FieldError>{error ?? undefined}</FieldError>
          {message && <p className="text-sm text-(--color-success)">{message}</p>}

          <div className="flex gap-3 border-t border-(--color-border) pt-4">
            <Button type="submit" variant="secondary" disabled={isSaving || isLocked}>
              Save Draft
            </Button>
            {canSubmit && (
              <Button type="button" variant="primary" onClick={handleSubmitForReview} disabled={isSaving}>
                Submit for Review
              </Button>
            )}
          </div>
        </form>
      </Card>

      {published && (
        <DashboardPanel title="Published Profile" icon={Globe}>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-(--color-success-soft) px-2.5 py-1 text-xs font-medium text-(--color-success)">
            <CheckCircle2 aria-hidden="true" size={13} strokeWidth={2} />
            Visible to recruiters
          </div>
          {published.bio && <p className="text-sm text-(--color-text-primary)">{published.bio}</p>}
          <p className="mt-3 text-xs text-(--color-text-secondary)">
            Published {new Date(published.publishedAt).toISOString().slice(0, 10)}
          </p>
        </DashboardPanel>
      )}
    </div>
  );
}
