"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterStudentProfileDTO, ResumeReference } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";

/**
 * Module 13 — the recruiter's single-candidate view. Fetch call, the
 * resume-reference flow, and the error/back-button state are unchanged
 * (confirmed by `recruiter-profile-page.test.tsx` passing unmodified).
 * Adds a persistent "← Back to Directory" link on the loaded state — the
 * journey-review finding the original planning pass already committed to
 * (V1_UI_SPECIFICATION.md Part G.2: "no way back from a student's profile
 * detail page to the directory except the rail's single nav item or the
 * browser back button") but never implemented until now.
 */
export default function RecruiterStudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<RecruiterStudentProfileDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const record = await apiClient.get<RecruiterStudentProfileDTO>(`/api/recruiters/students/${id}`, accessToken);
        if (!cancelled) setProfile(record);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load this profile.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, id]);

  async function handleResumeDownload() {
    if (!accessToken) return;
    try {
      const reference = await apiClient.get<ResumeReference>(`/api/recruiters/students/${id}/resume`, accessToken);
      // No object storage integration exists yet (see the route handler's
      // doc comment) — this surfaces the reference rather than streaming
      // bytes, which don't exist to stream.
      setResumeNotice(`Resume reference: ${reference.storageKey} (${reference.mimeType})`);
    } catch (err) {
      setResumeNotice(err instanceof ApiError ? err.message : "Unable to retrieve this resume.");
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/recruiter")}>
          Back to directory
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/recruiter" className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Directory
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {profile.fullName}
          </h1>
          <p className="text-sm text-(--color-text-secondary)">{profile.batchName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <Badge variant={profile.hasResume ? "active" : "neutral"}>
            {profile.hasResume ? "Resume available" : "No resume"}
          </Badge>
          {profile.portfolioLinks.length > 0 && <Badge variant="active">Portfolio linked</Badge>}
        </div>
      </div>

      {profile.bio && (
        <Card>
          <p className="text-sm text-(--color-text-primary)">{profile.bio}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <DataLabel>Skills</DataLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="neutral">
                  {skill}
                </Badge>
              ))}
              {profile.skills.length === 0 && <p className="text-sm text-(--color-text-secondary)">—</p>}
            </div>
          </div>
          <div>
            <DataLabel>Software</DataLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {profile.software.map((software) => (
                <Badge key={software} variant="neutral">
                  {software}
                </Badge>
              ))}
              {profile.software.length === 0 && <p className="text-sm text-(--color-text-secondary)">—</p>}
            </div>
          </div>
        </div>

        <div>
          <DataLabel>Selected Projects</DataLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-(--color-text-primary)">
            {profile.selectedProjects.map((project, index) => (
              <li key={index}>{project.title}</li>
            ))}
            {profile.selectedProjects.length === 0 && <li className="list-none text-(--color-text-secondary)">—</li>}
          </ul>
        </div>
        <div>
          <DataLabel>Certifications</DataLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-(--color-text-primary)">
            {profile.certifications.map((cert, index) => (
              <li key={index}>{cert.title}</li>
            ))}
            {profile.certifications.length === 0 && <li className="list-none text-(--color-text-secondary)">—</li>}
          </ul>
        </div>
        <div>
          <DataLabel>Internship Experience</DataLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-(--color-text-primary)">
            {profile.internships.map((internship, index) => (
              <li key={index}>{internship.company}</li>
            ))}
            {profile.internships.length === 0 && <li className="list-none text-(--color-text-secondary)">—</li>}
          </ul>
        </div>
        <div>
          <DataLabel>Portfolio &amp; Public Links</DataLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-(--color-accent)">
            {profile.portfolioLinks.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer noopener">
                  {link}
                </a>
              </li>
            ))}
            {profile.portfolioLinks.length === 0 && <li className="list-none text-(--color-text-secondary)">—</li>}
          </ul>
        </div>
      </Card>

      <Card className="space-y-2 border-t-2 border-t-(--color-accent)">
        <Button variant="primary" onClick={handleResumeDownload} disabled={!profile.hasResume} className="gap-2">
          <Download aria-hidden="true" size={16} strokeWidth={1.75} />
          {profile.hasResume ? "Download Resume" : "No Resume Available"}
        </Button>
        {resumeNotice && <p className="text-sm text-(--color-text-secondary)">{resumeNotice}</p>}
      </Card>
    </div>
  );
}
