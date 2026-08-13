"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Building2,
  CircleUser,
  ClipboardList,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { ApiError } from "@/lib/api-client";
import { roleHomePath } from "@/lib/role-home-path";
import type { DemoPersona } from "@/lib/demo-persona";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { QuickActionCard } from "@/components/public/quick-action-card";
import {
  HOME_HERO,
  HOME_ABOUT,
  HOME_CTA,
  STATS_CAPTION,
  SHOWCASE_INTRO,
  PLACEMENT_STATS,
  RECRUITING_CATEGORIES,
  FEATURED_PROJECTS,
  WHY_RECRUIT_FEATURES,
  LATEST_UPDATES,
  QUICK_ACTIONS,
} from "@/lib/public-content";

const STAT_ICONS: LucideIcon[] = [Award, Users2, Wallet];
const QUICK_ACTION_ICONS: LucideIcon[] = [ClipboardList, Building2, LogIn, CircleUser];
const UPDATE_TONE_CLASSES = [
  "text-(--color-accent)",
  "text-(--color-highlight)",
  "text-(--color-secondary)",
];

const DEMO_ENTRIES: {
  persona: DemoPersona;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    persona: "STUDENT",
    label: "Visit as Student",
    description: "Profile, applications, recruiter interest.",
    icon: GraduationCap,
  },
  {
    persona: "RECRUITER",
    label: "Visit as Recruiter",
    description: "Browse the directory, save, express interest.",
    icon: Users2,
  },
  {
    persona: "ADMIN",
    label: "Visit as Demo Admin",
    description: "The administrative view — read-only.",
    icon: ShieldCheck,
  },
];

/**
 * `/` — the public marketing Home page. An authenticated session is still
 * bounced straight to its own portal (see `roleHomePath`); only an
 * unauthenticated visitor sees the content below.
 *
 * Version 2.0 (visual pass 3 — editorial rebuild): pass 2 was still a
 * stack of card grids wearing the new palette — every section read as
 * "heading, then a row of equal cards," the single most generic SaaS-
 * template shape there is. This pass removes that pattern: no two
 * consecutive sections share a composition, most sections use no card at
 * all, imagery bleeds full-width and overlaps text instead of sitting in
 * equal boxed placeholders, and the page carries a second and third large
 * typographic moment (the stats band, the manifesto numerals) instead of
 * peaking once in the hero and flattening out. `FeatureCard` and
 * `UpdateCard` are intentionally NOT used here even though Home built
 * their content — the manifesto list and the editorial update rows below
 * are bespoke to this page; those two components remain exactly as they
 * were for the other public pages that still use them.
 */
export default function Home() {
  const { isLoading, isAuthenticated, role, loginAsDemo } = useAuth();
  const router = useRouter();
  const [pendingDemo, setPendingDemo] = useState<DemoPersona | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(roleHomePath(role));
  }, [isLoading, isAuthenticated, role, router]);

  async function handleDemoEntry(persona: DemoPersona) {
    setDemoError(null);
    setPendingDemo(persona);
    try {
      const { role: demoRole } = await loginAsDemo(persona);
      router.push(roleHomePath(demoRole));
    } catch (err) {
      setDemoError(
        err instanceof ApiError ? err.message : "Couldn't start the demo. Please try again.",
      );
      setPendingDemo(null);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-(--color-text-secondary)">
        <p className="font-[family-name:var(--font-data)] text-sm">Loading…</p>
      </div>
    );
  }

  const [leadProject, sideProject, ...otherProjects] = FEATURED_PROJECTS;

  return (
    <>
      {/* 1 — Hero: asymmetric split. Left-aligned type at full display
          scale; a full-bleed image fills the other half of the viewport,
          edge to edge, rather than sitting in a contained, rounded,
          equally-margined box below the fold. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <DataLabel className="text-(--color-accent)">{HOME_HERO.eyebrow}</DataLabel>
            <PageTitle className="mt-6 text-5xl font-bold leading-[1.03] tracking-tight lg:text-[5rem]">
              {HOME_HERO.headline}
            </PageTitle>
            <p className="mt-6 max-w-md text-base text-(--color-text-secondary) lg:text-lg">
              {HOME_HERO.subhead}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/placements"
                className={buttonClassName("primary", "px-8 py-3 text-base")}
              >
                Explore Placements
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-(--color-text-primary) underline-offset-4 transition-colors duration-150 hover:text-(--color-accent) hover:underline"
              >
                Sign In<span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>

          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <ImagePlaceholder
              label={HOME_HERO.imageLabel}
              aspect="auto"
              tone="bold"
              rounded={false}
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      {/* MYARCH public showcase — explore any of the three real portals
          without an account. Immediately after the hero, its own visually
          distinct callout panel (not folded into the hero's two CTAs, not
          anywhere near the logo/nav) so it reads as a deliberate, separate
          offer — "try it yourself" — rather than a third link competing
          with "Explore Placements" / "Sign In". */}
      <section className="border-b border-(--color-border) bg-(--color-surface)">
        <PageContainer className="py-10 lg:py-14">
          <div className="rounded-3xl border-2 border-(--color-accent)/25 bg-(--color-accent-soft) p-6 sm:p-8 lg:p-10">
            <DataLabel className="text-(--color-accent)">Try the demo</DataLabel>
            <SectionHeading className="mt-2 text-2xl lg:text-3xl">
              Explore the complete MYARCH platform without signing in
            </SectionHeading>
            <p className="mt-2 max-w-2xl text-sm text-(--color-text-secondary)">
              Step into a live demonstration account for the Student, Recruiter, or Admin
              experience — nothing you do there is saved.
            </p>
            {demoError && (
              <p role="alert" className="mt-4 text-sm font-medium text-(--color-highlight)">
                {demoError}
              </p>
            )}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {DEMO_ENTRIES.map(({ persona, label, description, icon: Icon }) => (
                <button
                  key={persona}
                  type="button"
                  onClick={() => handleDemoEntry(persona)}
                  disabled={pendingDemo !== null}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 text-left shadow-sm transition-colors duration-150 hover:border-(--color-accent) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
                    <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-base font-semibold text-(--color-text-primary)">
                    {pendingDemo === persona ? "Opening…" : label}
                  </span>
                  <span className="text-xs text-(--color-text-secondary)">{description}</span>
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
              No account required · Explore the platform
            </p>
          </div>
        </PageContainer>
      </section>

      {/* 2 — Stats: a plain full-width typographic band, no card in
          sight. The numbers themselves carry the section, at the same
          display scale as the hero headline — the page's second big
          statement rather than a quiet metrics footnote. */}
      <section className="border-y border-(--color-border) bg-(--color-surface-muted)">
        <PageContainer className="py-14 lg:py-20">
          <SectionHeading className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-text-secondary)">
            Placement Highlights
          </SectionHeading>
          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {PLACEMENT_STATS.map((stat, i) => {
              const StatIcon = STAT_ICONS[i];
              return (
                <div
                  key={stat.label}
                  className="sm:border-l sm:border-(--color-border) sm:pl-8 sm:first:border-l-0 sm:first:pl-0"
                >
                  {StatIcon && (
                    <StatIcon
                      aria-hidden="true"
                      size={22}
                      strokeWidth={1.75}
                      className="text-(--color-accent)"
                    />
                  )}
                  <p className="mt-3 font-[family-name:var(--font-display)] text-6xl font-bold tracking-tight text-(--color-text-primary) lg:text-7xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-(--color-text-primary)">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xs text-(--color-text-secondary)">{stat.scope}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-xs text-(--color-text-secondary)">{STATS_CAPTION}</p>
        </PageContainer>
      </section>

      {/* 3 — A thin, tinted tag row. Deliberately without its own
          heading, so it reads as a connective strip, not an eighth
          full section. */}
      <div className="bg-(--color-surface) py-8">
        <PageContainer>
          <DataLabel>Recruiting Partners Include</DataLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {RECRUITING_CATEGORIES.map((category) => (
              <span
                key={category}
                className="rounded-full border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-secondary)"
              >
                {category}
              </span>
            ))}
          </div>
        </PageContainer>
      </div>

      {/* 4 — Why Recruit: an asymmetric manifesto list, not a card grid.
          A large heading sits in its own narrow column beside a stacked
          list carrying its own oversized index numerals instead of icons
          — the page's third typographic register. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading className="text-balance text-3xl leading-tight lg:text-[2.25rem]">
            Why Recruit From VNIT Architecture
          </SectionHeading>
          <div className="divide-y divide-(--color-border) border-t border-(--color-border) lg:border-t-0">
            {WHY_RECRUIT_FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="flex items-center gap-6 py-6 first:pt-0 lg:first:pt-0"
              >
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-border) lg:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <CardTitle>{feature.title}</CardTitle>
                  <p className="mt-1.5 text-sm text-(--color-text-secondary)">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 5 — About: a full-bleed image with the text panel overlapping
          its lower edge, rather than a boxed image beside a paragraph.
          The one place on the page where a card floats over imagery — a
          single deliberate layered moment, not a repeated pattern. */}
      <section className="relative bg-(--color-surface)">
        <ImagePlaceholder
          label={HOME_ABOUT.imageLabel}
          aspect="auto"
          tone="cool"
          rounded={false}
          className="h-[26rem] w-full lg:h-[32rem]"
        />
        <PageContainer>
          <Card className="relative z-10 -mt-20 max-w-lg shadow-lg lg:-mt-28 lg:p-10">
            <SectionHeading className="text-2xl lg:text-3xl">About the Department</SectionHeading>
            <p className="mt-4 text-(--color-text-secondary)">{HOME_ABOUT.paragraph}</p>
            <div className="mt-6 rounded-2xl bg-(--color-accent-soft) p-5">
              <DataLabel className="text-(--color-accent)">{HOME_ABOUT.visionLabel}</DataLabel>
              <p className="mt-2 text-sm text-(--color-text-primary)">{HOME_ABOUT.visionText}</p>
            </div>
          </Card>
        </PageContainer>
      </section>

      {/* 6 — Featured Student Work: an offset image collage (one large
          plate, one smaller plate overlapping its corner) instead of a
          grid of equal cards, with every project's caption gathered
          underneath as a plain editorial list. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Featured Student Work" description={SHOWCASE_INTRO} />
        {leadProject && (
          <div className="relative mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <ImagePlaceholder
              label={`${leadProject.title} Photo`}
              aspect="wide"
              tone="bold"
              className="w-full shadow-lg lg:w-[76%]"
            />
            {sideProject && (
              <div className="absolute -bottom-8 right-2 hidden w-[34%] sm:block lg:-bottom-10 lg:right-[6%]">
                <ImagePlaceholder
                  label={`${sideProject.title} Photo`}
                  aspect="square"
                  tone="amber"
                  className="w-full shadow-xl ring-4 ring-(--color-surface-muted)"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-14 grid gap-8 border-t border-(--color-border) pt-10 sm:grid-cols-3 lg:mt-20">
          {FEATURED_PROJECTS.map((project) => (
            <div key={project.title}>
              <DataLabel>{project.studio}</DataLabel>
              <CardTitle className="mt-1.5">{project.title}</CardTitle>
              <p className="mt-2 text-sm text-(--color-text-secondary)">{project.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7 — Latest Updates: plain editorial rows, no cards — a
          category label, a title set as a headline, a description,
          divided by hairlines. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Latest Updates" />
        <div className="divide-y divide-(--color-border) border-t border-(--color-border)">
          {LATEST_UPDATES.map((update, i) => (
            <div
              key={update.title}
              className="flex flex-col gap-1.5 py-6 sm:flex-row sm:items-baseline sm:gap-10 sm:py-7"
            >
              <span
                className={`w-28 shrink-0 text-xs font-semibold uppercase tracking-wide ${UPDATE_TONE_CLASSES[i % UPDATE_TONE_CLASSES.length]}`}
              >
                {update.category}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">
                  {update.title}
                </h3>
                <p className="mt-1 text-sm text-(--color-text-secondary)">{update.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Quick Actions: one large lead action beside three compact
          ones, rather than four equal cards — the grid itself carries
          hierarchy instead of every entry point looking equally
          important. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Quick Actions" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:grid-rows-3">
          {QUICK_ACTIONS.map((action, i) => (
            <QuickActionCard
              key={action.title}
              index={String(i + 1).padStart(2, "0")}
              title={action.title}
              description={action.description}
              href={action.href}
              icon={QUICK_ACTION_ICONS[i]}
              className={i === 0 ? "lg:row-span-3" : undefined}
              featured={i === 0}
            />
          ))}
        </div>
      </Section>

      {/* 9 — Closing: a full-bleed color band, type set directly over
          it — no white panel floating on the page background, the one
          pattern already used for About and worth not repeating here. */}
      <section className="relative overflow-hidden">
        <ImagePlaceholder
          label={HOME_CTA.imageLabel}
          aspect="auto"
          tone="bold"
          rounded={false}
          minimal
          className="h-[22rem] w-full lg:h-[26rem]"
        />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <DataLabel className="text-white/80">{HOME_CTA.eyebrow}</DataLabel>
              <SectionHeading className="mt-3 text-3xl text-white lg:text-4xl">
                {HOME_CTA.title}
              </SectionHeading>
              <p className="mt-4 text-white/85">{HOME_CTA.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/login" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Sign In
                </Link>
                <Link
                  href="/contact"
                  className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90"
                >
                  Request Recruiter Access
                </Link>
                <Link
                  href="/placements"
                  className="text-sm font-semibold text-white/80 underline-offset-4 transition-colors duration-150 hover:text-white hover:underline"
                >
                  Explore Placements
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </>
  );
}
