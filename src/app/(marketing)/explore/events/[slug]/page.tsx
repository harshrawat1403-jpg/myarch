import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PrismaPublicEventRepository } from "@/modules/events";
import { PageContainer } from "@/components/public/page-container";
import { EventGallery } from "@/components/explore/event-gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await new PrismaPublicEventRepository(prisma).findBySlug((await params).slug);
  if (!event) return { title: "Event not found" };
  return { title: event.title, description: event.shortDescription || event.description || undefined, alternates: { canonical: `/explore/events/${event.slug}` }, openGraph: event.coverImageUrl ? { images: [event.coverImageUrl] } : undefined };
}

export default async function PublicEventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await new PrismaPublicEventRepository(prisma).findBySlug((await params).slug);
  if (!event) notFound();
  return <PageContainer className="py-10 md:py-16">
    <Link href="/explore" className="text-sm font-medium text-(--color-accent) hover:underline">← All events</Link>
    <section className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-10">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-(--color-accent)"><span>{event.category || "Department"}</span><span>•</span><span>{event.status}</span></div>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-5xl">{event.title}</h1>
      {event.shortDescription && <p className="mt-4 max-w-3xl text-lg text-(--color-text-secondary)">{event.shortDescription}</p>}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-(--color-text-secondary)">
        <span><CalendarDays aria-hidden="true" className="mr-1 inline" size={16}/>{event.startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}{event.endAt ? ` – ${event.endAt.toLocaleTimeString(undefined, { timeStyle: "short" })}` : ""}</span>
        {event.venue && <span><MapPin aria-hidden="true" className="mr-1 inline" size={16}/>{event.venue}</span>}
        <span>Organized by {event.organizer}</span>
      </div>
      {event.description && <p className="mt-8 max-w-3xl whitespace-pre-wrap text-(--color-text-primary)">{event.description}</p>}
    </section>
    <section className="mt-10"><h2 className="text-2xl font-semibold">Gallery</h2><div className="mt-4"><EventGallery items={event.gallery}/></div></section>
    {event.forms.length > 0 && <section className="mt-10"><h2 className="text-2xl font-semibold">Get involved</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{event.forms.map((form) => <Link key={form.id} href={`/student/forms/${form.id}`} className="rounded-lg border border-(--color-border) p-4 hover:border-(--color-accent)"><p className="text-xs font-semibold text-(--color-accent)">{form.kind}</p><h3 className="mt-1 font-semibold">{form.title}</h3>{form.description && <p className="mt-1 text-sm text-(--color-text-secondary)">{form.description}</p>}</Link>)}</div></section>}
    {event.announcements.length > 0 && <section className="mt-10"><h2 className="text-2xl font-semibold">Related announcements</h2><div className="mt-4 space-y-3">{event.announcements.map((announcement) => <article key={announcement.id} className="rounded-lg border border-(--color-border) p-4"><h3 className="font-semibold">{announcement.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-(--color-text-secondary)">{announcement.content}</p></article>)}</div></section>}
  </PageContainer>;
}
