"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { FormApplicationSummary } from "@/modules/applications";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentFormApplicationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<FormApplicationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!accessToken) return; apiClient.get<FormApplicationSummary[]>("/api/applications/mine", accessToken).then(setItems).catch((e) => setError(e instanceof ApiError ? e.message : "Unable to load applications.")); }, [accessToken]);
  return <div className="max-w-3xl space-y-6"><div><p className="text-sm text-(--color-text-secondary)">Generic Forms</p><h1 className="text-2xl font-semibold">My form applications</h1></div>{error && <p className="text-sm text-(--color-danger)">{error}</p>}{items.length === 0 ? <Card><p className="text-sm text-(--color-text-secondary)">You have not submitted a form application.</p></Card> : items.map((item) => <Card key={item.id} className="flex items-center justify-between gap-4"><div><p className="font-medium">{item.formTitle}</p><p className="text-sm text-(--color-text-secondary)">Submitted {new Date(item.submittedAt).toLocaleDateString()}</p>{item.decisionReason && <p className="text-sm text-(--color-text-secondary)">Decision: {item.decisionReason}</p>}</div><Badge variant="neutral">{item.currentStatus}</Badge></Card>)}</div>;
}
