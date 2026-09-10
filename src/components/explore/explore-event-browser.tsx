"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface EventCard { slug: string; title: string; shortDescription: string | null; category: string | null; startAt: string; endAt: string | null; venue: string | null; organizer: string; status: "UPCOMING" | "ONGOING" | "COMPLETED"; featured: boolean; hasRegistration: boolean; coverImageUrl: string | null; }
const categories = ["", "Technical", "Cultural", "Placement", "Workshop", "Seminar", "Department", "Competition", "Other"];

export function ExploreEventBrowser() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "24" });
        if (search) params.set("search", search); if (status) params.set("status", status); if (category) params.set("category", category);
        const response = await fetch(`/api/public/events?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("We could not load events right now.");
        const payload = await response.json() as { data: EventCard[] };
        setEvents(payload.data);
      } catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof Error ? err.message : "We could not load events right now."); }
      finally { setLoading(false); }
    }, 200);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [search, status, category]);
  return <>
    <div className="mb-8 grid gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 md:grid-cols-[1fr_180px_180px]">
      <div className="relative"><Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-3 text-(--color-text-secondary)" /><Input aria-label="Search events" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search events" /></div>
      <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All events</option><option value="UPCOMING">Upcoming</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Past</option></Select>
      <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((entry) => <option key={entry} value={entry}>{entry || "All categories"}</option>)}</Select>
    </div>
    {error && <div role="alert" className="rounded-lg border border-(--color-danger) p-4 text-sm text-(--color-danger)">{error}</div>}
    {loading && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-80 animate-pulse rounded-xl bg-(--color-surface)" />)}</div>}
    {!loading && !error && events.length === 0 && <Card className="py-14 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-3 text-(--color-text-secondary)" /><h2 className="font-semibold">No events found</h2><p className="mt-1 text-sm text-(--color-text-secondary)">Try another search or filter.</p></Card>}
    {!loading && !error && events.length > 0 && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{events.map((event) => <Link key={event.slug} href={`/explore/events/${event.slug}`} className="group overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-(--color-accent)">
      <div className="relative h-44 bg-linear-to-br from-(--color-accent)/30 to-(--color-surface)">{event.coverImageUrl ? <Image src={event.coverImageUrl} alt={`Cover image for ${event.title}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /> : <Sparkles aria-hidden="true" className="absolute inset-0 m-auto text-(--color-accent)" size={42} />}{event.featured && <span className="absolute left-3 top-3 rounded-full bg-(--color-accent) px-2 py-1 text-xs font-semibold text-white">Featured</span>}</div>
      <div className="p-5"><div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-(--color-accent)"><span>{event.category || "Department"}</span><span>{event.status}</span></div><h2 className="text-lg font-semibold group-hover:text-(--color-accent)">{event.title}</h2><p className="mt-2 line-clamp-2 text-sm text-(--color-text-secondary)">{event.shortDescription || "Discover this department event."}</p><div className="mt-4 space-y-1 text-xs text-(--color-text-secondary)"><p><CalendarDays aria-hidden="true" className="mr-1 inline" size={14} />{new Date(event.startAt).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}</p>{event.venue && <p><MapPin aria-hidden="true" className="mr-1 inline" size={14} />{event.venue}</p>}</div>{event.hasRegistration && <span className="mt-4 inline-block rounded-full bg-(--color-accent)/10 px-2 py-1 text-xs font-medium text-(--color-accent)">Registration available</span>}</div>
    </Link>)}</div>}
  </>;
}
