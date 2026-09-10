"use client";

import { useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function EventPresentationManager({ eventId, accessToken }: { eventId: string; accessToken: string | null }) {
  const toast = useToast();
  const [cover, setCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(event: FormEvent<HTMLFormElement>, target: "cover" | "gallery") {
    event.preventDefault(); const file = target === "cover" ? cover : gallery; if (!file) return; setBusy(true);
    try {
      const form = new FormData(); form.set("target", target); form.set("file", file); if (target === "gallery") form.set("caption", caption);
      const response = await fetch(`/api/events/${eventId}/presentation`, { method: "POST", headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined, body: form });
      if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error || "Upload failed"); }
      toast.success(target === "cover" ? "Cover image saved." : "Gallery image added.");
      if (target === "cover") setCover(null); else { setGallery(null); setCaption(""); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed."); } finally { setBusy(false); }
  }
  return <Card><div className="flex items-center gap-2"><ImagePlus aria-hidden="true" size={18}/><h2 className="font-semibold">Public presentation</h2></div><p className="mt-1 text-sm text-(--color-text-secondary)">Add a public cover or gallery image. JPEG, PNG, and WebP files up to 10 MB are accepted.</p><div className="mt-4 grid gap-5 md:grid-cols-2"><form onSubmit={(event) => void upload(event, "cover")} className="space-y-2"><Label htmlFor="event-cover">Cover image</Label><Input id="event-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /><Button type="submit" variant="secondary" disabled={!cover || busy}>Save cover</Button></form><form onSubmit={(event) => void upload(event, "gallery")} className="space-y-2"><Label htmlFor="event-gallery">Gallery image</Label><Input id="event-gallery" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setGallery(event.target.files?.[0] ?? null)} /><Input aria-label="Gallery caption" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional caption" /><Button type="submit" variant="secondary" disabled={!gallery || busy}>Add to gallery</Button></form></div></Card>;
}
