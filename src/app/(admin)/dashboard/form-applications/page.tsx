"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { FormApplicationDetail, FormApplicationSummary } from "@/modules/applications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormRenderer } from "@/components/forms/form-renderer";

export default function FormApplicationsPage() {
  const { accessToken, role } = useAuth();
  const [items, setItems] = useState<FormApplicationSummary[]>([]);
  const [selected, setSelected] = useState<FormApplicationDetail | null>(null);
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function load() { if (!accessToken) return; try { setItems(await apiClient.get<FormApplicationSummary[]>("/api/applications", accessToken)); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to load applications."); } }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
  async function open(id: string) { if (!accessToken) return; try { setSelected(await apiClient.get<FormApplicationDetail>(`/api/applications/${id}`, accessToken)); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to load application."); } }
  async function act(path: string, body: unknown) { if (!accessToken || !selected) return; try { await apiClient.post(`/api/applications/${selected.id}/${path}`, body, accessToken); await load(); await open(selected.id); } catch (e) { setError(e instanceof ApiError ? e.message : "Action failed."); } }
  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]"><section className="space-y-3"><div><p className="text-sm text-(--color-text-secondary)">Generic Applications</p><h1 className="text-2xl font-semibold">Review queue</h1></div>{error && <p className="text-sm text-(--color-danger)">{error}</p>}{items.map((item) => <button type="button" key={item.id} onClick={() => open(item.id)} className="w-full text-left"><Card className={selected?.id === item.id ? "border-(--color-accent)" : ""}><div className="flex justify-between gap-2"><div><p className="font-medium">{item.formTitle}</p><p className="text-sm text-(--color-text-secondary)">{item.applicantName}</p></div><Badge variant="neutral">{item.currentStatus}</Badge></div></Card></button>)}</section>{selected ? <Card className="space-y-5"><div><h2 className="text-xl font-semibold">{selected.formTitle}</h2><p className="text-sm text-(--color-text-secondary)">{selected.applicantName}</p></div><FormRenderer fields={selected.fields} answers={selected.answers} readOnly />{!selected.electionId && <><div className="border-t border-(--color-border) pt-4"><Label htmlFor="reviewer-id">Assign reviewer user ID</Label><div className="flex gap-2"><Input id="reviewer-id" value={reviewerUserId} onChange={(e) => setReviewerUserId(e.target.value)} placeholder="UUID" /><Button type="button" onClick={() => act("reviewers", { reviewerUserId })}>Assign</Button></div></div><div><Label htmlFor="review-notes">Review notes</Label><Textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /><Button className="mt-2" type="button" onClick={() => act("reviews", { notes })}>Record review</Button></div>{role === "SECRETARY" && selected.currentStatus === "UNDER_REVIEW" && <div className="flex gap-2 border-t border-(--color-border) pt-4"><Button type="button" variant="primary" onClick={() => act("decision", { status: "SELECTED" })}>Select</Button><Button type="button" variant="destructive" onClick={() => act("decision", { status: "REJECTED" })}>Reject</Button></div>}</>}{selected.electionId && <p className="text-sm">Election application received. Further election stages are not yet available.</p>}</Card> : <Card><p className="text-sm text-(--color-text-secondary)">Select an application to review.</p></Card>}</div>;
}
