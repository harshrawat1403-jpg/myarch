"use client";

import { useEffect, useState } from "react";
import type { ElectionRecord } from "@/modules/elections";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProcessingCandidate = {
  id: string; applicantUserId: string; status: string;
  positions: { positionId: string; position: { id: string; title: string } }[];
  correctionRequests: { id: string; status: string; instructions: string }[];
  objections: { id: string; status: string; reason: string }[];
  shortlistEntries: { positionId: string }[];
  interviews: { id: string; status: string; scheduledAt: string | null; scoresLockedAt: string | null }[];
  finalCandidates: { positionId: string }[];
};
type Processing = { candidates: ProcessingCandidate[]; criteria: { id: string; name: string; maxScore: number; required: boolean }[] };
const nextStage: Partial<Record<ElectionRecord["status"], string>> = {
  APPLICATION_CLOSED: "SCRUTINY",
  SCRUTINY: "CORRECTIONS_OBJECTIONS",
  CORRECTIONS_OBJECTIONS: "SHORTLIST",
  SHORTLIST: "INTERVIEWS",
};

export function ElectionProcessingAdmin({ election, accessToken, reload }: { election: ElectionRecord; accessToken: string; reload: () => Promise<void> }) {
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setProcessing(await apiClient.get<Processing>(`/api/elections/${election.id}/processing`, accessToken));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load updates state after an API response.
    void load().catch(() => setMessage("Unable to load processing queue"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election.id, accessToken]);
  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await operation(); await Promise.all([load(), reload()]); setMessage(success); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to update election processing"); }
    finally { setBusy(false); }
  }
  if (!["APPLICATION_CLOSED", "SCRUTINY", "CORRECTIONS_OBJECTIONS", "SHORTLIST", "INTERVIEWS", "FINAL_CANDIDATES"].includes(election.status)) return null;
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Candidate processing</h2>
    {message && <p role="status" className="rounded border border-(--color-border) p-3 text-sm">{message}</p>}
    {nextStage[election.status] && <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/elections/${election.id}/status`, { status: nextStage[election.status] }, accessToken), `Moved to ${nextStage[election.status]!.replaceAll("_", " ")}`)}>Advance to {nextStage[election.status]!.replaceAll("_", " ")}</Button>}
    {election.status === "SHORTLIST" && <CriterionForm busy={busy} onSave={(data) => act(() => apiClient.post(`/api/elections/${election.id}/interview-criteria`, data, accessToken), "Interview criterion saved")} />}
    {processing?.criteria.length ? <p className="text-sm">Rubric: {processing.criteria.map((item) => `${item.name} / ${item.maxScore}`).join(" · ")}</p> : null}
    {processing?.candidates.map((candidate) => <Card key={candidate.id} className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{candidate.applicantUserId}</p><p className="text-sm">{candidate.status} · {candidate.positions.map((position) => position.position.title).join(", ")}</p></div></div>
      {election.status === "SCRUTINY" && <div className="flex flex-wrap gap-2">
        {(["ELIGIBLE", "INELIGIBLE", "CORRECTION_REQUIRED"] as const).map((decision) => <Button key={decision} disabled={busy || candidate.status === "WITHDRAWN"} onClick={() => void act(() => apiClient.post(`/api/elections/${election.id}/candidates/${candidate.id}/scrutiny`, { decision, reason: "Recorded by Secretary during election scrutiny." }, accessToken), `Scrutiny recorded: ${decision}`)}>{decision.replaceAll("_", " ")}</Button>)}
        {candidate.status === "CORRECTION_REQUIRED" && <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/elections/${election.id}/candidates/${candidate.id}/corrections`, { instructions: "Please provide the requested clarification or supporting evidence." }, accessToken), "Correction requested")}>Request correction</Button>}
      </div>}
      {election.status === "SHORTLIST" && candidate.status === "ELIGIBLE" && <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/elections/${election.id}/shortlist`, { candidateId: candidate.id, positionIds: candidate.positions.map((position) => position.positionId) }, accessToken), "Candidate shortlisted")}>Shortlist candidate</Button>}
      {election.status === "INTERVIEWS" && candidate.status === "SHORTLISTED" && <p className="text-sm">Create interviews through the interview API after assigning panel users. Existing interviews: {candidate.interviews.length}.</p>}
      {candidate.correctionRequests.length > 0 && <p className="text-sm">Corrections: {candidate.correctionRequests.map((request) => request.status).join(", ")}</p>}
      {candidate.objections.length > 0 && <p className="text-sm">Objections: {candidate.objections.map((objection) => objection.status).join(", ")}</p>}
    </Card>)}
  </section>;
}

function CriterionForm({ busy, onSave }: { busy: boolean; onSave: (data: unknown) => Promise<void> }) {
  return <Card><form className="grid gap-3 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onSave({ name: data.get("name"), description: data.get("description"), maxScore: Number(data.get("maxScore")), weight: Number(data.get("weight")), displayOrder: Number(data.get("displayOrder")), required: true }); }}><Input name="name" required placeholder="Criterion" /><Input name="maxScore" required type="number" min={1} defaultValue={10} /><Input name="weight" required type="number" min={0.01} step="0.01" defaultValue={1} /><Input name="displayOrder" required type="number" min={0} defaultValue={0} /><Textarea className="sm:col-span-3" name="description" placeholder="Description" /><Button disabled={busy} type="submit">Add criterion</Button></form></Card>;
}
