"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import type { StudentCoreCommitteeSelectionDetail } from "@/modules/selections";
import { apiClient, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormRenderer } from "@/components/forms/form-renderer";

function lifecycleLabel(selection: StudentCoreCommitteeSelectionDetail): string {
  if (selection.application?.result)
    return selection.application.result.outcome === "SELECTED" ? "Final selected" : "Final not selected";
  if (selection.application?.status === "INELIGIBLE") return "Not shortlisted";
  if (selection.application?.status === "SHORTLISTED") return "Shortlisted";
  if (selection.application?.status === "CORRECTION_REQUIRED") return "Update requested";
  if (selection.application && selection.status === "APPLICATION_OPEN") return "Submitted";
  if (selection.application) return "Under review";
  const now = Date.now();
  if (now < new Date(selection.applicationOpenAt).getTime()) return "Opens soon";
  if (selection.status === "APPLICATION_OPEN" && now < new Date(selection.applicationCloseAt).getTime()) return "Open";
  if (selection.status === "PUBLISHED") return "Result published";
  return "Closed";
}

export default function StudentCoreCommitteeDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [selection, setSelection] = useState<StudentCoreCommitteeSelectionDetail | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    if (!accessToken || !params.id) return;
    setSelection(await apiClient.get<StudentCoreCommitteeSelectionDetail>(`/api/student/core-committee-selections/${params.id}`, accessToken));
  };
  useEffect(() => {
    if (!accessToken || !params.id) return;
    void apiClient
      .get<StudentCoreCommitteeSelectionDetail>(`/api/student/core-committee-selections/${params.id}`, accessToken)
      .then(setSelection)
      .catch((error) => setMessage(error instanceof ApiError ? error.message : "Unable to load this Core Committee application."));
  }, [accessToken, params.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedDomain = useMemo(
    () => selection?.positions.find((position) => position.id === selectedDomainId) ?? null,
    [selection, selectedDomainId],
  );
  const withinWindow = Boolean(
    selection &&
      selection.status === "APPLICATION_OPEN" &&
      new Date(selection.applicationOpenAt).getTime() <= now &&
      now < new Date(selection.applicationCloseAt).getTime(),
  );

  async function submit() {
    if (!accessToken || !selection || !selectedDomain || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(
        `/api/student/core-committee-selections/${selection.id}/application`,
        { positionId: selectedDomain.id, answers },
        accessToken,
      );
      await load();
      setReviewing(false);
      setMessage("Application submitted successfully.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to submit application.");
    } finally {
      setBusy(false);
    }
  }

  if (!selection) return <p className="text-sm text-(--color-text-secondary)">{message || "Loading application…"}</p>;
  const label = lifecycleLabel(selection);
  const clientFields = selection.fields.map((field) => ({ ...field, formId: "core-committee" }));

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/student/core-committee" className="text-sm underline">Back to Core Committee</Link>
      {message && <p role="status" className="rounded border border-(--color-border) p-3 text-sm">{message}</p>}
      <Card className="space-y-5">
        <header className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{selection.title}</h1><Badge variant={label === "Open" ? "active" : "neutral"}>{label}</Badge></div><p className="text-sm text-(--color-text-secondary)">Applications open {new Date(selection.applicationOpenAt).toLocaleString()} and close {new Date(selection.applicationCloseAt).toLocaleString()}.</p></header>
        <section className="space-y-2"><h2 className="font-medium">Application brief</h2><p className="whitespace-pre-wrap text-sm text-(--color-text-secondary)">{selection.brief}</p></section>

        {selection.application ? (
          <section className="space-y-3 border-t border-(--color-border) pt-4"><h2 className="font-medium">Your submitted application</h2><p className="text-sm">Selected domain: <strong>{selection.application.domain.title}</strong></p><p className="text-sm">Submitted {new Date(selection.application.submittedAt).toLocaleString()} · {label}</p>{(selection.application.interviews ?? []).length > 0 && <div className="space-y-2"><h3 className="font-medium">Interviews</h3>{(selection.application.interviews ?? []).map((interview) => <div key={interview.id} className="rounded border border-(--color-border) p-3 text-sm"><p>{interview.status.replaceAll("_", " ")}{interview.scheduledAt ? ` · ${new Date(interview.scheduledAt).toLocaleString()}` : ""}</p>{interview.durationMinutes && <p>Duration: {interview.durationMinutes} minutes</p>}{interview.mode && <p>Mode: {interview.mode}</p>}{interview.location && <p>Venue/link: {interview.location}</p>}{interview.candidateInstructions && <p>{interview.candidateInstructions}</p>}</div>)}</div>}{selection.application.result && <p className="rounded border border-(--color-border) p-3 text-sm">Final result: {selection.application.result.outcome === "SELECTED" ? "Selected" : "Not selected"} · Published {new Date(selection.application.result.publishedAt).toLocaleString()}</p>}{clientFields.length > 0 && <FormRenderer fields={clientFields} answers={selection.application.answers} readOnly />}</section>
        ) : (
          <>
            <section className="space-y-3 border-t border-(--color-border) pt-4"><div><h2 className="font-medium">Choose one domain</h2><p className="text-sm text-(--color-text-secondary)">You may apply for exactly one domain in this selection.</p></div>{selection.positions.map((position) => <label key={position.id} className={`block cursor-pointer rounded border p-4 ${selectedDomainId === position.id ? "border-(--color-accent)" : "border-(--color-border)"}`}><div className="flex gap-3"><input type="radio" name="domain" checked={selectedDomainId === position.id} disabled={!withinWindow || busy} onChange={() => { setSelectedDomainId(position.id); setReviewing(false); setConfirmed(false); }} /><div className="space-y-1"><p className="font-medium">{position.title}</p><p className="text-sm text-(--color-text-secondary)">{position.seats} {position.seats === 1 ? "position" : "positions"}</p><p className="whitespace-pre-wrap text-sm text-(--color-text-secondary)">{position.description}</p></div></div></label>)}</section>
            {!withinWindow && <p className="rounded border border-(--color-border) p-3 text-sm">{now < new Date(selection.applicationOpenAt).getTime() ? `Applications open on ${new Date(selection.applicationOpenAt).toLocaleString()}.` : `Applications closed on ${new Date(selection.applicationCloseAt).toLocaleString()}.`}</p>}
            {withinWindow && selectedDomain && <section className="space-y-4 border-t border-(--color-border) pt-4"><div><h2 className="font-medium">Application questions</h2><p className="text-sm text-(--color-text-secondary)">Applying for {selectedDomain.title}.</p></div>{clientFields.length > 0 && <FormRenderer fields={clientFields} answers={answers} onChange={(key, value) => setAnswers({ ...answers, [key]: value })} />}{!reviewing ? <Button type="button" variant="primary" disabled={busy} onClick={() => setReviewing(true)}>Review application</Button> : <div className="space-y-3 rounded border border-(--color-border) p-4"><h2 className="font-medium">Review and submit</h2><p className="text-sm">Application: {selection.title}</p><p className="text-sm">Selected domain: {selectedDomain.title} · {selectedDomain.seats} {selectedDomain.seats === 1 ? "position" : "positions"}</p>{clientFields.length > 0 && <FormRenderer fields={clientFields} answers={answers} readOnly />}<label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm that I want to apply for this domain.</label><div className="flex gap-2"><Button type="button" variant="primary" disabled={busy || !confirmed} onClick={() => void submit()}>Submit application</Button><Button type="button" disabled={busy} onClick={() => setReviewing(false)}>Back</Button></div></div>}</section>}
          </>
        )}
      </Card>
    </div>
  );
}
