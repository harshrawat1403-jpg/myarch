"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type GalleryItem = { id: string; caption: string | null; imageUrl: string };
export function EventGallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((index) => index === null ? null : (index + 1) % items.length);
      if (event.key === "ArrowLeft") setActive((index) => index === null ? null : (index - 1 + items.length) % items.length);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [items.length]);
  if (!items.length) return <p className="text-sm text-(--color-text-secondary)">No gallery images have been added yet.</p>;
  const selected = active === null ? undefined : items[active];
  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{items.map((item, index) => <button key={item.id} type="button" onClick={() => setActive(index)} className="relative aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-(--color-accent)"><Image src={item.imageUrl} alt={item.caption || `Event gallery image ${index + 1}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition hover:scale-105" /></button>)}</div>
    {selected && <div role="dialog" aria-modal="true" aria-label="Event gallery" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"><Button aria-label="Previous image" variant="ghost" className="text-white" onClick={() => setActive((index) => index === null ? null : (index - 1 + items.length) % items.length)}><ChevronLeft /></Button><div className="relative h-[75vh] w-full max-w-5xl"><Image src={selected.imageUrl} alt={selected.caption || `Event gallery image ${active! + 1}`} fill sizes="100vw" className="object-contain" priority /></div><Button aria-label="Next image" variant="ghost" className="text-white" onClick={() => setActive((index) => index === null ? null : (index + 1) % items.length)}><ChevronRight /></Button><Button aria-label="Close gallery" variant="ghost" className="absolute right-4 top-4 text-white" onClick={() => setActive(null)}><X /></Button>{selected.caption && <p className="absolute bottom-5 max-w-xl rounded bg-black/70 px-3 py-2 text-center text-sm text-white">{selected.caption}</p>}</div>}
  </>;
}
