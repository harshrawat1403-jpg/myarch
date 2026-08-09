"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { PublicDirectoryProfile } from "@/modules/public-directory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { PageContainer } from "@/components/public/page-container";
import { Section } from "@/components/public/section";

/**
 * V4.0 B5 — `/directory/[id]`, the public, unauthenticated profile detail
 * (§7 step 1). Mirrors the recruiter directory's single-candidate page
 * structurally, with a narrower field set (no resume download — that stays
 * a Recruiter-only capability; §22 approves Express Interest/Save as the
 * only new recruiter-facing actions, not public resume access) and the
 * one field the recruiter view never has: cgpa, shown only when the
 * repository itself returned a non-null value (already gated server-side
 * by the student's own showCgpa flag).
 */
export default function PublicDirectoryProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicDirectoryProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/public/directory/${id}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error?.message ?? "Unable to load this profile.");
          return;
        }
        setProfile(body.data);
      } catch {
        if (!cancelled) setError("Unable to load this profile.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <Section>
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-sm text-(--color-danger)">{error}</p>
          <Link href="/directory" className="text-sm font-medium text-(--color-accent) hover:underline">
            Back to Directory
          </Link>
        </div>
      </Section>
    );
  }

  if (!profile) {
    return (
      <PageContainer className="py-16">
        <p className="text-center text-sm text-(--color-text-secondary)">Loading…</p>
      </PageContainer>
    );
  }

  return (
    <Section>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/directory" className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
          Back to Directory
        </Link>

        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-accent-soft) text-xl font-semibold text-(--color-accent)">
            {profile.profilePhotoUrl ? (
              <Image src={profile.profilePhotoUrl} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              profile.fullName.charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
              {profile.fullName}
            </h1>
            <p className="text-sm text-(--color-text-secondary)">{profile.batchName}</p>
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
            {profile.cgpa !== null && (
              <div>
                <DataLabel>CGPA</DataLabel>
                <p className="mt-1 text-sm text-(--color-text-primary)">{profile.cgpa.toFixed(2)}</p>
              </div>
            )}
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

        {profile.hasResume && (
          <Card>
            <Badge variant="active">Resume available</Badge>
            <p className="mt-2 text-xs text-(--color-text-secondary)">
              Recruiters can request this student&apos;s resume through the recruiter portal.
            </p>
          </Card>
        )}
      </div>
    </Section>
  );
}
