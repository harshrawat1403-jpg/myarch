"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/modules/auth/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Assignment = { id: string; status: string; scheduledAt: string | null; scoresLockedAt: string | null; election: { id: string; title: string }; candidate: { applicant: { email: string; studentProfile: { fullName: string } | null } }; position: { title: string }; panelMembers: { id: string; isRecused: boolean }[] };
export function ElectionPanelWorkspace() {
  const { accessToken } = useAuth(); const [items, setItems] = useState<Assignment[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { if (accessToken) setItems(await apiClient.get<Assignment[]>("/api/elections/panel", accessToken)); }
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect -- async API response updates the workspace.
    void load().catch((error) => setMessage(error instanceof ApiError ? error.message : "Unable to load assigned interviews")); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
  return <div className="max-w-4xl space-y-5"><h1 className="text-2xl font-semibold">Election interview panel</h1>{message && <p role="status">{message}</p>}{!items.length && <p>No interviews are assigned to you.</p>}{items.map((item) => <Card key={item.id} className="space-y-3"><p className="font-medium">{item.election.title} — {item.position.title}</p><p>{item.candidate.applicant.studentProfile?.fullName ?? item.candidate.applicant.email} · {item.status}</p><p className="text-sm">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Schedule pending"}</p>{item.status === "COMPLETED" && !item.scoresLockedAt && !item.panelMembers[0]?.isRecused && <ScoreForm busy={busy} onSave={async (score) => { setBusy(true); try { await apiClient.post(`/api/elections/${item.election.id}/interviews/${item.id}/scores`, { scores: [score] }, accessToken!); await load(); setMessage("Score saved"); } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to save score"); } finally { setBusy(false); } }} />}{item.scoresLockedAt && <p className="text-sm">Scores are locked.</p>}</Card>)}</div>;
}
function ScoreForm({ busy, onSave }: { busy: boolean; onSave: (score: { criterionId: string; score: number; comments?: string }) => Promise<void> }) {
  return <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onSave({ criterionId: String(data.get("criterionId")), score: Number(data.get("score")), comments: String(data.get("comments") || "") }); }}><Input name="criterionId" required placeholder="Criterion ID" /><Input name="score" required type="number" min={0} placeholder="Score" /><Input name="comments" placeholder="Optional comments" /><Button disabled={busy} type="submit">Save score</Button></form>;
}
