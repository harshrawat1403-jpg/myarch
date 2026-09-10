import type { Metadata } from "next";
import { ExploreEventBrowser } from "@/components/explore/explore-event-browser";
import { PageContainer } from "@/components/public/page-container";

export const metadata: Metadata = { title: "Explore events", description: "Discover department events, workshops, competitions, and more." };
export default function ExplorePage() { return <PageContainer className="py-12 md:py-16"><p className="text-sm font-semibold tracking-[0.18em] text-(--color-accent)">EXPLORE</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl">Events worth showing up for.</h1><p className="mt-4 max-w-2xl text-(--color-text-secondary)">Find workshops, competitions, cultural gatherings, and department opportunities.</p><div className="mt-10"><ExploreEventBrowser /></div></PageContainer>; }
