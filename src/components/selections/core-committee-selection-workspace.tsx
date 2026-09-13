"use client";
/* eslint-disable react-hooks/set-state-in-effect -- follows the established authenticated API-load pattern. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatPanel } from "@/components/ui/stat-panel";

type Candidate = {
  id: string; applicantUserId: string; candidateName: string; rollNumber: string | null;
  applicationId: string; submittedAt: string; answers: unknown; applicationStatus: string; status: string;
  positions: Array<{ positionId: string; title: string }>;
  shortlist: Array<{ positionId: string; createdAt: string }>;
  interviews: Array<{ id: string; positionId: string; scheduledAt: string | null; durationMinutes: number | null; mode: string | null; location: string | null; candidateAttended: boolean | null; completedAt: string | null; status: string }>;
  decisions: Array<{ positionId: string; outcome: "SELECTED" | "NOT_SELECTED"; state: "RECORDED" | "FINALIZED"; decidedAt: string; finalizedAt: string | null }>;
};
type Processing = { candidates: Candidate[]; positions: Array<{ id: string; title: string; seats: number; displayOrder: number }> };
type Selection = { id: string; title: string; status: string };
type WorkspaceView = "dashboard" | "applications" | "shortlist" | "interviews" | "results";

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString() : "—";
const domainOf = (candidate: Candidate) => candidate.positions.map((position) => position.title).join(", ");

export function CoreCommitteeSelectionWorkspace({ id, view }: { id: string; view: WorkspaceView }) {
  const { accessToken } = useAuth();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [message, setMessage] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken) return;
    const [selectionResult, processingResult] = await Promise.all([
      apiClient.get<Selection>(`/api/core-committee-selections/${id}`, accessToken),
      apiClient.get<Processing>(`/api/core-committee-selections/${id}/processing`, accessToken),
    ]);
    setSelection(selectionResult);
    setProcessing(processingResult);
  }, [accessToken, id]);
  useEffect(() => { void load().catch((error) => setMessage(error instanceof ApiError ? error.message : "Unable to load Core Committee workflow")); }, [load]);
  const candidates = useMemo(() => (processing?.candidates ?? []).filter((candidate) =>
    (domain === "ALL" || candidate.positions.some((position) => position.positionId === domain)) &&
    (status === "ALL" || candidate.status === status),
  ), [processing, domain, status]);
  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true); setMessage("");
    try { await operation(); await load(); setMessage(success); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to update Core Committee workflow"); }
    finally { setBusy(false); }
  };
  const urls = (name: WorkspaceView) => `/dashboard/core-committee-selections/${id}/${name}`;
  if (!processing || !selection) return <p>{message || "Loading Core Committee workflow…"}</p>;
  const scheduled = processing.candidates.flatMap((candidate) => candidate.interviews.filter((entry) => entry.status === "SCHEDULED").map((entry) => ({ candidate, entry })));
  const completed = processing.candidates.flatMap((candidate) => candidate.interviews.filter((entry) => entry.status === "COMPLETED"));
  return <div className="max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-(--color-text-secondary)">Core Committee · Council-led selection</p><h1 className="text-2xl font-semibold">{selection.title}</h1></div><Badge variant="neutral">{selection.status}</Badge></div>
    <nav className="flex flex-wrap gap-2 text-sm" aria-label="Core Committee workflow">
      {(["dashboard", "applications", "shortlist", "interviews", "results"] as WorkspaceView[]).map((item) => <Link key={item} href={urls(item)} className={`rounded px-3 py-2 ${view === item ? "bg-(--color-primary) text-white" : "border border-(--color-border)"}`}>{item.charAt(0).toUpperCase() + item.slice(1)}</Link>)}
    </nav>
    {message && <p role="status" className="rounded border border-(--color-border) p-3 text-sm">{message}</p>}
    {view === "dashboard" && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><StatPanel compact icon={ClipboardList} label="Applications" value={processing.candidates.length} scope="Submitted"/><StatPanel compact icon={Users} label="Shortlisted" value={processing.candidates.filter((candidate) => candidate.shortlist.length > 0).length} scope="Candidates"/><StatPanel compact icon={CalendarClock} label="Scheduled" value={scheduled.length} scope="Interviews"/><StatPanel compact icon={CheckCircle2} label="Completed" value={completed.length} scope="Interviews"/><StatPanel compact icon={Users} label="Positions" value={processing.positions.reduce((sum, position) => sum + position.seats, 0)} scope="Total capacity"/></div><Card className="flex flex-wrap gap-3"><Link className="underline" href={urls("applications")}>View applications</Link><Link className="underline" href={urls("shortlist")}>View shortlist</Link><Link className="underline" href={urls("interviews")}>Manage interviews</Link><Link className="underline" href={urls("results")}>View results</Link></Card></>}
    {view === "applications" && <ApplicationPanel candidates={candidates} positions={processing.positions} domain={domain} status={status} setDomain={setDomain} setStatus={setStatus} onDetail={setDetail} onShortlist={(candidate) => act(() => apiClient.post(`/api/core-committee-selections/${id}/shortlist`, { candidateId: candidate.id, positionIds: candidate.positions.map((position) => position.positionId) }, accessToken!), "Candidate shortlisted")} onReject={(candidate) => act(() => apiClient.post(`/api/core-committee-selections/${id}/candidates/${candidate.id}/scrutiny`, { decision: "INELIGIBLE", reason: "Not selected for this Core Committee intake" }, accessToken!), "Candidate rejected")} busy={busy}/>}
    {view === "shortlist" && <ShortlistPanel candidates={processing.candidates} positions={processing.positions} onDetail={setDetail} />}
    {view === "interviews" && <InterviewPanel candidates={processing.candidates} selectionId={id} token={accessToken!} act={act} busy={busy} />}
    {view === "results" && <ResultsPanel candidates={processing.candidates} positions={processing.positions} selectionId={id} token={accessToken!} act={act} busy={busy}/>}
    {detail && <ApplicationDetail candidate={detail} close={() => setDetail(null)} />}
  </div>;
}

function ApplicationPanel({ candidates, positions, domain, status, setDomain, setStatus, onDetail, onShortlist, onReject, busy }: { candidates: Candidate[]; positions: Processing["positions"]; domain: string; status: string; setDomain: (value: string) => void; setStatus: (value: string) => void; onDetail: (candidate: Candidate) => void; onShortlist: (candidate: Candidate) => void; onReject: (candidate: Candidate) => void; busy: boolean }) {
  return <Card className="space-y-4"><div className="flex flex-wrap gap-3"><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded border border-(--color-border) p-2"><option value="ALL">All domains</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border border-(--color-border) p-2"><option value="ALL">All statuses</option>{[...new Set(candidates.map((candidate) => candidate.status))].map((value) => <option key={value}>{value}</option>)}</select></div><div className="space-y-3">{candidates.map((candidate) => <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-(--color-border) p-3"><div><p className="font-medium">{candidate.candidateName}</p><p className="text-sm text-(--color-text-secondary)">{candidate.rollNumber ?? "No roll recorded"} · {domainOf(candidate)} · Submitted {dateTime(candidate.submittedAt)}</p></div><div className="flex gap-2"><Badge variant="neutral">{candidate.status}</Badge><Button onClick={() => onDetail(candidate)}>View application</Button>{candidate.status === "ELIGIBLE" && <><Button disabled={busy} onClick={() => onShortlist(candidate)}>Shortlist</Button><Button disabled={busy} onClick={() => onReject(candidate)}>Reject</Button></>}</div></div>)}{!candidates.length && <p>No applications match these filters.</p>}</div></Card>;
}
function ShortlistPanel({ candidates, positions, onDetail }: { candidates: Candidate[]; positions: Processing["positions"]; onDetail: (candidate: Candidate) => void }) { return <div className="space-y-4">{positions.map((position) => { const entries = candidates.filter((candidate) => candidate.shortlist.some((entry) => entry.positionId === position.id)); return <Card key={position.id} className="space-y-3"><div><h2 className="font-semibold">{position.title}</h2><p className="text-sm text-(--color-text-secondary)">{position.seats} positions · {candidates.filter((candidate) => candidate.positions.some((entry) => entry.positionId === position.id)).length} applications · {entries.length} shortlisted</p></div>{entries.map((candidate) => <div key={candidate.id} className="flex justify-between gap-3 border-t border-(--color-border) pt-3"><span>{candidate.candidateName} · {candidate.rollNumber ?? "—"} · {dateTime(candidate.submittedAt)}</span><Button onClick={() => onDetail(candidate)}>View application</Button></div>)}{!entries.length && <p className="text-sm">No shortlisted candidates.</p>}</Card>; })}</div>; }
function InterviewPanel({ candidates, selectionId, token, act, busy }: { candidates: Candidate[]; selectionId: string; token: string; act: (op: () => Promise<unknown>, success: string) => Promise<void>; busy: boolean }) { const [candidateId, setCandidateId] = useState(""); const [when, setWhen] = useState(""); const selected = candidates.find((candidate) => candidate.id === candidateId); return <div className="space-y-4"><Card><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!selected || !when) return; const positionId = selected.shortlist[0]?.positionId; if (!positionId) return; void act(() => apiClient.post(`/api/core-committee-selections/${selectionId}/interviews`, { candidateId: selected.id, positionId, scheduledAt: new Date(when).toISOString() }, token), "Interview scheduled"); }}><div><Label>Shortlisted candidate</Label><select required value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="w-full rounded border border-(--color-border) p-2"><option value="">Select candidate</option>{candidates.filter((candidate) => candidate.shortlist.length > 0).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.candidateName} · {domainOf(candidate)}</option>)}</select></div><div><Label>Date and start time</Label><Input required type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)}/></div><Button disabled={busy}>Schedule interview</Button></form></Card><Card className="space-y-3"><h2 className="font-semibold">Interviews</h2>{candidates.flatMap((candidate) => candidate.interviews.map((interview, index) => <div key={`${candidate.id}-${index}`} className="flex flex-wrap justify-between gap-3 border-t border-(--color-border) pt-3"><span>{candidate.candidateName} · {domainOf(candidate)} · {dateTime(interview.scheduledAt)} · {interview.location ?? interview.mode ?? "Venue pending"}</span><div className="flex gap-2"><Badge variant="neutral">{interview.status}</Badge>{interview.status === "SCHEDULED" && <><Button disabled={busy} onClick={() => { const value = window.prompt("New date and time (YYYY-MM-DDTHH:mm)"); if (value) void act(() => apiClient.patch(`/api/core-committee-selections/${selectionId}/interviews/${interview.id}`, { scheduledAt: new Date(value).toISOString() }, token), "Interview rescheduled"); }}>Reschedule</Button><Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/core-committee-selections/${selectionId}/interviews/${interview.id}/complete`, { candidateAttended: true }, token), "Interview completed")}>Complete</Button><Button disabled={busy} onClick={() => void act(() => apiClient.delete(`/api/core-committee-selections/${selectionId}/interviews/${interview.id}`, token), "Interview cancelled")}>Cancel</Button></>}</div></div>))}</Card></div>; }
function ResultsPanel({ candidates, positions, selectionId, token, act, busy }: { candidates: Candidate[]; positions: Processing["positions"]; selectionId: string; token: string; act: (op: () => Promise<unknown>, success: string) => Promise<void>; busy: boolean }) { return <div className="space-y-4">{positions.map((position) => { const underReview = candidates.filter((candidate) => candidate.positions.some((entry) => entry.positionId === position.id)); const selected = underReview.filter((candidate) => candidate.decisions.some((decision) => decision.positionId === position.id && decision.outcome === "SELECTED")); return <Card key={position.id} className="space-y-3"><div><h2 className="font-semibold">{position.title}</h2><p className="text-sm text-(--color-text-secondary)">Capacity {position.seats} · Candidates under review {underReview.length} · Selected {selected.length} · Remaining {Math.max(0, position.seats - selected.length)}</p></div>{underReview.map((candidate) => <div key={candidate.id} className="flex flex-wrap justify-between gap-3 border-t border-(--color-border) pt-3"><span>{candidate.candidateName} · {candidate.decisions.find((decision) => decision.positionId === position.id)?.outcome ?? "PENDING"}</span><Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/core-committee-selections/${selectionId}/decisions`, { candidateId: candidate.id, positionId: position.id, outcome: "SELECTED", internalNote: "Council final decision" }, token), "Final decision recorded")}>Select</Button></div>)}</Card>; })}</div>; }
function ApplicationDetail({ candidate, close }: { candidate: Candidate; close: () => void }) { return <Card className="space-y-3"><div className="flex justify-between gap-3"><div><h2 className="text-lg font-semibold">{candidate.candidateName}</h2><p className="text-sm text-(--color-text-secondary)">{candidate.rollNumber ?? "No roll recorded"} · {domainOf(candidate)} · {dateTime(candidate.submittedAt)}</p></div><Button onClick={close}>Close</Button></div><p>Workflow status: <Badge variant="neutral">{candidate.status}</Badge></p><pre className="max-h-80 overflow-auto rounded border border-(--color-border) p-3 text-xs">{JSON.stringify(candidate.answers, null, 2)}</pre></Card>; }
