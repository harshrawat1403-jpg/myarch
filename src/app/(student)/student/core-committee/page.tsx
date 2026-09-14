"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import type { StudentCoreCommitteeSelectionSummary } from "@/modules/selections";
import { apiClient, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function applicationStatus(selection: StudentCoreCommitteeSelectionSummary): string {
  if (selection.application) {
    if (selection.application.result) {
      return selection.application.result.outcome === "SELECTED" ? "Final selected" : "Final not selected";
    }
    if (selection.application.status === "INELIGIBLE") return "Not shortlisted";
    if (selection.application.status === "CORRECTION_REQUIRED") return "Update requested";
    if (selection.application.status === "SHORTLISTED") return "Shortlisted";
    if (selection.application.status === "WITHDRAWN") return "Withdrawn";
    if (selection.status === "APPLICATION_OPEN") return "Submitted";
    if (["SCRUTINY", "CORRECTIONS", "SHORTLIST", "INTERVIEWS", "COUNCIL_REVIEW", "SELECTION_DECIDED"].includes(selection.status))
      return "Under review";
    return "Submitted";
  }
  const now = Date.now();
  if (now < new Date(selection.applicationOpenAt).getTime()) return "Opens soon";
  if (selection.status === "APPLICATION_OPEN" && now < new Date(selection.applicationCloseAt).getTime())
    return "Open";
  if (selection.status === "PUBLISHED") return "Result published";
  return "Closed";
}

export default function StudentCoreCommitteePage() {
  const { accessToken } = useAuth();
  const [selections, setSelections] = useState<StudentCoreCommitteeSelectionSummary[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    void apiClient
      .get<StudentCoreCommitteeSelectionSummary[]>("/api/student/core-committee-selections", accessToken)
      .then(setSelections)
      .catch((error) =>
        setMessage(error instanceof ApiError ? error.message : "Unable to load Core Committee applications."),
      );
  }, [accessToken]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-(--color-text-secondary)">Council-led selection</p>
        <h1 className="text-2xl font-semibold">Core Committee</h1>
      </div>
      {message && <p role="status" className="rounded border border-(--color-border) p-3 text-sm">{message}</p>}
      {!selections.length && !message && <p className="text-sm text-(--color-text-secondary)">No Core Committee applications are available.</p>}
      <div className="space-y-3">
        {selections.map((selection) => {
          const status = applicationStatus(selection);
          return (
            <Card key={selection.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{selection.title}</h2><Badge variant={status === "Open" ? "active" : "neutral"}>{status}</Badge></div>
                <p className="line-clamp-2 whitespace-pre-wrap text-sm text-(--color-text-secondary)">{selection.brief}</p>
                <p className="text-sm text-(--color-text-secondary)">Applications: {new Date(selection.applicationOpenAt).toLocaleString()} – {new Date(selection.applicationCloseAt).toLocaleString()}</p>
                {selection.application && <p className="text-sm text-(--color-text-secondary)">Domain: {selection.application.domain.title} · Submitted {new Date(selection.application.submittedAt).toLocaleString()}</p>}
                {selection.application?.interviews.map((interview) => <p key={interview.id} className="text-sm text-(--color-text-secondary)">Interview: {interview.status.replaceAll("_", " ")}{interview.scheduledAt ? ` · ${new Date(interview.scheduledAt).toLocaleString()}` : ""}</p>)}
              </div>
              <Link href={`/student/core-committee/${selection.id}`} className="rounded bg-(--color-accent) px-3 py-2 text-sm font-medium text-white">
                {selection.application ? "View application" : "Explore domains"}
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
