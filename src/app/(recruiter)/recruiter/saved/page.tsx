"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterStudentProfileDTO } from "@/modules/recruiters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { ExpressInterestControl, SaveShortlistButtons } from "@/components/recruiter/save-shortlist-buttons";

/**
 * V4.0 C4 — /recruiter/saved. "Shortlisted" is a filtered view of this same
 * list, never a separate route (§8, §23 — Q3): the toggle below filters
 * client-side over the one already-fetched list, matching every other list
 * page's unpaginated-fetch convention in this codebase.
 */
export default function RecruiterSavedPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<RecruiterStudentProfileDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shortlistedOnly, setShortlistedOnly] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const results = await apiClient.get<RecruiterStudentProfileDTO[]>("/api/recruiters/saved", accessToken);
        if (!cancelled) setStudents(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load your saved students.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function handleInteractionChange(studentId: string, next: { isSaved: boolean; isShortlisted: boolean }) {
    setStudents((current) =>
      next.isSaved
        ? current.map((s) => (s.studentId === studentId ? { ...s, ...next } : s))
        : current.filter((s) => s.studentId !== studentId),
    );
  }

  function handleInterestChange(studentId: string, interestStatus: RecruiterStudentProfileDTO["interestStatus"]) {
    setStudents((current) => current.map((s) => (s.studentId === studentId ? { ...s, interestStatus } : s)));
  }

  const visible = useMemo(
    () => (shortlistedOnly ? students.filter((s) => s.isShortlisted) : students),
    [students, shortlistedOnly],
  );

  return (
    <div className="space-y-8">
      <div>
        <DataLabel>Saved Students</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Saved
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Students you&apos;ve saved from the directory. Private to your account.
        </p>
      </div>

      {students.length > 0 && (
        <Checkbox
          id="shortlistedOnly"
          checked={shortlistedOnly}
          onChange={(e) => setShortlistedOnly(e.target.checked)}
          label="Shortlisted only"
        />
      )}

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && students.length === 0 && (
        <Card>
          <EmptyState icon={Bookmark} message="You haven't saved any students yet." />
        </Card>
      )}

      {!isLoading && students.length > 0 && visible.length === 0 && (
        <Card>
          <EmptyState icon={Bookmark} message="None of your saved students are shortlisted yet." />
        </Card>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((student) => (
            <Link key={student.studentId} href={`/recruiter/students/${student.studentId}`} className="block">
              <Card className="h-full transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md">
                <CardTitle>{student.fullName}</CardTitle>
                <p className="text-sm text-(--color-text-secondary)">{student.batchName}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {student.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="neutral">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-border) pt-3">
                  <SaveShortlistButtons
                    studentId={student.studentId}
                    state={{ isSaved: student.isSaved, isShortlisted: student.isShortlisted }}
                    accessToken={accessToken}
                    onChange={(next) => handleInteractionChange(student.studentId, next)}
                    stopPropagation
                  />
                  <ExpressInterestControl
                    studentId={student.studentId}
                    interestStatus={student.interestStatus}
                    accessToken={accessToken}
                    onChange={(status) => handleInterestChange(student.studentId, status)}
                    stopPropagation
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
