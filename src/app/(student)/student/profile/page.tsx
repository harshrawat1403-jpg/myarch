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
 * V4.0 D6 (§2 IA — "/student/profile [NEW, split out] Profile draft editor
 * (existing content, own route)") — this is the exact, byte-for-byte
 * pre-D6 content of `/student` (confirmed by the pre-existing test suite,
 * renamed to student-profile-editor-page.test.tsx and importing from this
 * new path, passing unmodified). `/student` itself is now the Career Hub
 * dashboard built in this same milestone.
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

  async function uploadProfileFile(kind: "resume" | "portfolio", file: File | undefined) {
    if (!accessToken || !studentProfileId || !file) return;
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await apiClient.upload(`/api/students/${studentProfileId}/profile/${kind === "resume" ? "resume" : "portfolio-images"}`, formData, accessToken);
      const refreshed = await apiClient.get<ProfileDraft>(`/api/students/${studentProfileId}/profile/draft`, accessToken);
      setDraft(refreshed);
      setMessage(kind === "resume" ? "Resume uploaded. Submit your draft for review to publish it." : "Portfolio image uploaded. Submit your draft for review to publish it.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to upload this file.");
    } finally { setIsSaving(false); }
  }

  async function deletePortfolioImage(imageId: string) {
    if (!accessToken || !studentProfileId) return;
    setIsSaving(true);
    try {
      await apiClient.delete(`/api/students/${studentProfileId}/profile/portfolio-images/${imageId}`, accessToken);
      setDraft((current) => current ? { ...current, portfolioImages: (current.portfolioImages ?? []).filter((image) => image.id !== imageId) } : current);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Unable to remove the portfolio image."); } finally { setIsSaving(false); }
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
          <div>
            <Label htmlFor="resume">Resume (PDF, 3MB maximum)</Label>
            <Input id="resume" type="file" accept="application/pdf" disabled={isLocked || isSaving} onChange={(event) => void uploadProfileFile("resume", event.target.files?.[0])} />
            {draft?.resumeFileId && <p className="mt-1 text-xs text-(--color-success)">A resume is attached to this draft.</p>}
          </div>
          <div>
            <Label htmlFor="portfolioImage">Portfolio images (JPEG, PNG, or WebP; 5MB each)</Label>
            <Input id="portfolioImage" type="file" accept="image/jpeg,image/png,image/webp" disabled={isLocked || isSaving || (draft?.portfolioImages?.length ?? 0) >= 10} onChange={(event) => void uploadProfileFile("portfolio", event.target.files?.[0])} />
            {(draft?.portfolioImages?.length ?? 0) > 0 && <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">{draft?.portfolioImages?.map((image) => <li key={image.id} className="flex items-center justify-between"><span>{image.title ?? "Portfolio image"}</span><Button type="button" variant="ghost" onClick={() => void deletePortfolioImage(image.id)} disabled={isLocked || isSaving}>Remove</Button></li>)}</ul>}
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
