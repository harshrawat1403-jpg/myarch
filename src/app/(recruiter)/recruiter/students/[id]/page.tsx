"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterStudentProfileDTO, ResumeReference } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TitleBlock } from "@/components/title-block";

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
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/recruiter")}>
          Back to directory
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-[--color-text-secondary]">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
          {profile.fullName}
        </h1>
        <p className="text-sm text-[--color-text-secondary]">{profile.batchName}</p>
      </div>

      {profile.bio && (
        <p className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5 text-sm text-[--color-text-primary]">
          {profile.bio}
        </p>
      )}

      <div className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="neutral">
                {skill}
              </Badge>
            ))}
            {profile.skills.length === 0 && <p className="text-sm text-[--color-text-secondary]">—</p>}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Software</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {profile.software.map((software) => (
              <Badge key={software} variant="neutral">
                {software}
              </Badge>
            ))}
            {profile.software.length === 0 && <p className="text-sm text-[--color-text-secondary]">—</p>}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Selected Projects</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-primary]">
            {profile.selectedProjects.map((project, index) => (
              <li key={index}>{project.title}</li>
            ))}
            {profile.selectedProjects.length === 0 && <li className="list-none text-[--color-text-secondary]">—</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Certifications</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-primary]">
            {profile.certifications.map((cert, index) => (
              <li key={index}>{cert.title}</li>
            ))}
            {profile.certifications.length === 0 && <li className="list-none text-[--color-text-secondary]">—</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Internship Experience</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-primary]">
            {profile.internships.map((internship, index) => (
              <li key={index}>{internship.company}</li>
            ))}
            {profile.internships.length === 0 && <li className="list-none text-[--color-text-secondary]">—</li>}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-text-secondary]">Portfolio &amp; Public Links</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[--color-accent]">
            {profile.portfolioLinks.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer noopener">
                  {link}
                </a>
              </li>
            ))}
            {profile.portfolioLinks.length === 0 && <li className="list-none text-[--color-text-secondary]">—</li>}
          </ul>
        </div>

        <TitleBlock project={profile.fullName} scale={profile.batchName} date={new Date()} drawnBy="Approved Profile" />
      </div>

      <div className="space-y-2">
        <Button variant="primary" onClick={handleResumeDownload} disabled={!profile.hasResume}>
          {profile.hasResume ? "Download Resume" : "No Resume Available"}
        </Button>
        {resumeNotice && <p className="text-sm text-[--color-text-secondary]">{resumeNotice}</p>}
      </div>
    </div>
  );
}
