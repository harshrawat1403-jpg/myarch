"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { FormRecord } from "@/modules/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormRenderer } from "@/components/forms/form-renderer";

export default function StudentFormsPage() {
  const { accessToken } = useAuth();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [selected, setSelected] = useState<FormRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (!accessToken) return; apiClient.get<FormRecord[]>("/api/forms", accessToken).then(setForms).catch((e) => setMessage(e instanceof ApiError ? e.message : "Unable to load forms.")); }, [accessToken]);
  async function submit() { if (!accessToken || !selected) return; try { await apiClient.post(`/api/forms/${selected.id}/applications`, { answers }, accessToken); setMessage("Application submitted."); setSelected(null); } catch (e) { setMessage(e instanceof ApiError ? e.message : "Unable to submit application."); } }
  return <div className="max-w-3xl space-y-6"><div><p className="text-sm text-(--color-text-secondary)">Generic Forms</p><h1 className="text-2xl font-semibold">Available forms</h1></div>{message && <p className="text-sm text-(--color-text-secondary)">{message}</p>}{selected ? <Card className="space-y-5"><div><h2 className="text-xl font-semibold">{selected.title}</h2>{selected.description && <p className="text-sm text-(--color-text-secondary)">{selected.description}</p>}</div><FormRenderer fields={selected.fields} answers={answers} onChange={(key, value) => setAnswers({ ...answers, [key]: value })} /><div className="flex gap-2"><Button type="button" variant="primary" onClick={submit}>Submit application</Button><Button type="button" onClick={() => setSelected(null)}>Cancel</Button></div></Card> : <div className="space-y-3">{forms.map((form) => <Card key={form.id} className="flex items-center justify-between gap-4"><div><p className="font-medium">{form.title}</p><p className="text-sm text-(--color-text-secondary)">{form.description ?? "No description"}</p></div><Button type="button" onClick={() => { setSelected(form); setAnswers({}); }}>Open</Button></Card>)}</div>}</div>;
}
