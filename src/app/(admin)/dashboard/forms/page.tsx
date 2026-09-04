"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { FormFieldType, FormRecord } from "@/modules/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const FIELD_TYPES: readonly FormFieldType[] = ["TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DROPDOWN", "RADIO", "CHECKBOX", "DATE"];
const OPTION_FIELD_TYPES: readonly FormFieldType[] = ["DROPDOWN", "RADIO"];
type FormBuilderField = { key: string; label: string; type: FormFieldType; options?: string[] };
const blankField = (): FormBuilderField => ({ key: "", label: "", type: "TEXT" });

export default function FormsPage() {
  const { accessToken } = useAuth();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormBuilderField[]>([blankField()]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!accessToken) return;
    try { setForms(await apiClient.get<FormRecord[]>("/api/forms", accessToken)); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to load forms."); }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function createForm() {
    if (!accessToken) return;
    try {
      await apiClient.post("/api/forms", { title, description: description || null, fields: fields.map((field, index) => ({ ...field, options: OPTION_FIELD_TYPES.includes(field.type) ? field.options : undefined, displayOrder: index })) }, accessToken);
      setTitle(""); setDescription(""); setFields([blankField()]); await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to create form."); }
  }

  function updateField(index: number, patch: Partial<FormBuilderField>) {
    setFields(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  }

  function addOption(index: number) {
    setFields(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, options: [...(field.options ?? []), ""] } : field));
  }

  function updateOption(index: number, optionIndex: number, value: string) {
    setFields(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, options: (field.options ?? []).map((option, currentIndex) => currentIndex === optionIndex ? value : option) } : field));
  }
  async function changeStatus(form: FormRecord, status: "PUBLISHED" | "CLOSED") {
    if (!accessToken) return;
    try { await apiClient.post(`/api/forms/${form.id}/status`, { status }, accessToken); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to change form status."); }
  }

  return <div className="max-w-4xl space-y-8">
    <div><p className="text-sm text-(--color-text-secondary)">Generic Forms</p><h1 className="mt-1 text-2xl font-semibold">Create and publish forms</h1></div>
    {error && <p className="text-sm text-(--color-danger)">{error}</p>}
    <Card className="space-y-4">
      <div><Label htmlFor="form-title">Title</Label><Input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label htmlFor="form-description">Description</Label><Textarea id="form-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="space-y-3"><div className="flex items-center justify-between"><Label>Fields</Label><Button type="button" variant="ghost" onClick={() => setFields([...fields, { key: "", label: "", type: "TEXT" }])}>Add field</Button></div>
        {fields.map((field, index) => <div key={index} className="space-y-2"><div className="grid gap-2 sm:grid-cols-[1fr_1fr_180px]"><Input placeholder="key" value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} /><Input placeholder="label" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} /><select className="rounded-md border border-(--color-border) bg-(--color-background) px-3 text-sm" value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FormFieldType, options: OPTION_FIELD_TYPES.includes(e.target.value as FormFieldType) ? (field.options ?? [""]) : undefined })}>{FIELD_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>{OPTION_FIELD_TYPES.includes(field.type) && <div className="ml-2 space-y-2 border-l-2 border-(--color-border) pl-3"><Label>Options</Label>{(field.options ?? [""]).map((option, optionIndex) => <Input key={optionIndex} placeholder={`Option ${optionIndex + 1}`} value={option} onChange={(e) => updateOption(index, optionIndex, e.target.value)} />)}<Button type="button" variant="ghost" onClick={() => addOption(index)}>Add option</Button></div>}</div>)}
      </div>
      <Button type="button" variant="primary" disabled={!title.trim() || fields.some((field) => !field.key.trim() || !field.label.trim() || (OPTION_FIELD_TYPES.includes(field.type) && !(field.options ?? []).some((option) => option.trim())))} onClick={createForm}>Create draft</Button>
    </Card>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Existing forms</h2>{forms.length === 0 ? <Card><div className="flex items-center gap-3 text-sm text-(--color-text-secondary)"><FileText size={18} />No forms created yet.</div></Card> : forms.map((form) => <Card key={form.id} className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">{form.title}</p><p className="text-sm text-(--color-text-secondary)">{form.fields.length} fields</p></div><div className="flex items-center gap-3"><Badge variant="neutral">{form.status}</Badge>{form.status === "DRAFT" && <Button type="button" variant="primary" onClick={() => changeStatus(form, "PUBLISHED")}>Publish</Button>}{form.status === "PUBLISHED" && <Button type="button" variant="secondary" onClick={() => changeStatus(form, "CLOSED")}>Close</Button>}</div></Card>)}</section>
  </div>;
}
