import Link from "next/link";
import { Award, Users2, Wallet, type LucideIcon } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { ProcessSteps } from "@/components/public/process-steps";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { PLACEMENT_STATS, RECRUITING_CATEGORIES } from "@/lib/public-content";
import {
  PLACEMENTS_HERO,
  PLACEMENT_PROCESS_STEPS,
  INTERNSHIP_OVERVIEW,
  INTERNSHIP_IMAGE_LABEL,
  SUCCESS_STORIES,
  RECRUITER_LOGO_COUNT,
  STUDENT_PREPARATION_STEPS,
  RECRUITER_ENGAGEMENT_STEPS,
  PLACEMENTS_FAQ,
  PLACEMENTS_CTA,
} from "@/lib/placements-content";

const STATS_CAPTION = "Illustrative figures — verified department statistics to follow.";
const IMAGE_TONES = ["violet", "amber", "cool"] as const;
const STAT_ICONS: LucideIcon[] = [Award, Users2, Wallet];

/**
 * `/placements` (Version 2.0 editorial pass) — a pure Server Component,
 * same rationale as About: nothing here depends on auth state.
 *
 * Inherits Home/About's language: the same asymmetric hero, the same
 * plain typographic stats band as Home's (identical `PLACEMENT_STATS`
 * data — same treatment, not a second invented layout for the same
 * numbers), the same full-bleed closing band instead of `CtaPanel`.
 * Specific to this page's trust-building purpose: an honest "Success
 * Stories" panel row (editable placeholders, never fabricated names or
 * quotes) and an editable recruiter-logo grid — both explicitly asked
 * for and absent from the page before this pass. Student Preparation and
 * Recruiter Engagement — two parallel step sequences — are placed side by
 * side as a comparison layout instead of two consecutive identical
 * timelines, which is also why they use a compact vertical list rather
 * than `ProcessSteps`; the page's main Placement Process keeps the
 * horizontal `ProcessSteps` timeline as its one prominent flow diagram.
 */
export default function PlacementsPage() {
  return (
    <>
      {/* 1 — Hero: same asymmetric shape as Home/About. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <DataLabel className="text-(--color-accent)">{PLACEMENTS_HERO.eyebrow}</DataLabel>
            <PageTitle className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl">
              {PLACEMENTS_HERO.title}
            </PageTitle>
            <p className="mt-6 max-w-md text-base text-(--color-text-secondary) lg:text-lg">{PLACEMENTS_HERO.subhead}</p>
          </div>
          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <ImagePlaceholder label={PLACEMENTS_HERO.imageLabel} aspect="auto" tone="bold" rounded={false} className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* 2 — Placement Process: the page's one prominent horizontal
          timeline. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Placement Process" />
        <ProcessSteps steps={PLACEMENT_PROCESS_STEPS} />
      </Section>

      {/* 3 — Placement Statistics: the same plain typographic band as
          Home's — identical data, identical treatment. */}
      <section className="border-y border-(--color-border) bg-(--color-surface-muted)">
        <PageContainer className="py-14 lg:py-20">
          <SectionHeading className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-text-secondary)">
            Placement Statistics
          </SectionHeading>
          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {PLACEMENT_STATS.map((stat, i) => {
              const StatIcon = STAT_ICONS[i];
              return (
                <div key={stat.label} className="sm:border-l sm:border-(--color-border) sm:pl-8 sm:first:border-l-0 sm:first:pl-0">
                  {StatIcon && <StatIcon aria-hidden="true" size={22} strokeWidth={1.75} className="text-(--color-accent)" />}
                  <p className="mt-3 font-[family-name:var(--font-display)] text-6xl font-bold tracking-tight text-(--color-text-primary) lg:text-7xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-(--color-text-primary)">{stat.label}</p>
                  <p className="mt-1 text-xs text-(--color-text-secondary)">{stat.scope}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-xs text-(--color-text-secondary)">{STATS_CAPTION}</p>
        </PageContainer>
      </section>

      {/* 4 — Success Stories: honest highlight panels — editable
          placeholders, never fabricated testimonials. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Success Stories" description="Placement outcomes will appear here as they're confirmed." />
        <div className="grid gap-6 sm:grid-cols-3">
          {SUCCESS_STORIES.map((story, i) => (
            <div key={i} className="overflow-hidden rounded-[28px] border border-(--color-border) bg-(--color-surface) shadow-sm">
              <ImagePlaceholder label={story.imageLabel} aspect="square" tone={IMAGE_TONES[i % IMAGE_TONES.length]} tag={false} rounded={false} />
              <p className="p-6 text-center text-sm font-medium text-(--color-text-secondary)">{story.role}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Internship Opportunities: an editorial image+text spread. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <ImagePlaceholder label={INTERNSHIP_IMAGE_LABEL} aspect="square" tone="cool" />
          <div>
            <SectionIntro title="Internship Opportunities" />
            <p className="text-(--color-text-secondary)">{INTERNSHIP_OVERVIEW}</p>
          </div>
        </div>
      </Section>

      {/* 6 — Recruiter Categories: a tag row plus an editable
          recruiter-logo grid. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Recruiter Categories" />
        <div className="flex flex-wrap gap-2">
          {RECRUITING_CATEGORIES.map((category) => (
            <span
              key={category}
              className="rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-xs text-(--color-text-secondary) shadow-sm"
            >
              {category}
            </span>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {Array.from({ length: RECRUITER_LOGO_COUNT }).map((_, i) => (
            <ImagePlaceholder key={i} label="Replace Logo" aspect="square" tag={false} tone={IMAGE_TONES[i % IMAGE_TONES.length]} />
          ))}
        </div>
      </Section>

      {/* 7 — Student Preparation Process + Recruiter Engagement
          Workflow: a side-by-side comparison layout — two parallel
          journeys, not two consecutive identical timelines. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading className="text-2xl lg:text-[1.75rem]">Student Preparation Process</SectionHeading>
            <div className="mt-8 space-y-6">
              {STUDENT_PREPARATION_STEPS.map((step, i) => (
                <div key={step.title} className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) font-[family-name:var(--font-display)] text-xs font-semibold text-(--color-accent)">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <CardTitle>{step.title}</CardTitle>
                    <p className="mt-1 text-sm text-(--color-text-secondary)">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading className="text-2xl lg:text-[1.75rem]">Recruiter Engagement Workflow</SectionHeading>
            <div className="mt-8 space-y-6">
              {RECRUITER_ENGAGEMENT_STEPS.map((step, i) => (
                <div key={step.title} className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-secondary-soft) font-[family-name:var(--font-display)] text-xs font-semibold text-(--color-secondary)">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <CardTitle>{step.title}</CardTitle>
                    <p className="mt-1 text-sm text-(--color-text-secondary)">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 8 — FAQ: a narrow, centered accordion. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Frequently Asked Questions" />
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={PLACEMENTS_FAQ} />
        </div>
      </Section>

      {/* 9 — Closing: the same full-bleed color band as Home/About. */}
      <section className="relative overflow-hidden">
        <ImagePlaceholder label={PLACEMENTS_CTA.imageLabel} aspect="auto" tone="bold" rounded={false} minimal className="h-[22rem] w-full lg:h-[26rem]" />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <DataLabel className="text-white/80">{PLACEMENTS_CTA.eyebrow}</DataLabel>
              <SectionHeading className="mt-3 text-3xl text-white lg:text-4xl">{PLACEMENTS_CTA.title}</SectionHeading>
              <p className="mt-4 text-white/85">{PLACEMENTS_CTA.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/contact" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Request Recruiter Access
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90"
                >
                  Student Sign In
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </>
  );
}
