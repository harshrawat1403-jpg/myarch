import Link from "next/link";
import { CheckCircle2, Compass, LayoutGrid, Lightbulb, Users, type LucideIcon } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { ProcessSteps } from "@/components/public/process-steps";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { WHY_RECRUIT_FEATURES, PLACEMENT_STATS, type FeatureItem } from "@/lib/public-content";
import { SKILL_MATRIX, SOFTWARE_ECOSYSTEM } from "@/lib/students-content";
import {
  RECRUITER_ENGAGEMENT_STEPS,
  INTERNSHIP_OVERVIEW,
  FAQ_DIRECTORY_ACCESS,
  FAQ_RECRUITING_COST,
  FAQ_INTERNSHIP_ONLY,
  FAQ_SHORTLISTING,
} from "@/lib/placements-content";
import {
  RECRUITERS_HERO,
  HIRING_MODELS,
  PLACEMENT_SUPPORT,
  RECRUITERS_FAQ_EXTRA,
  RECRUITER_TESTIMONIALS,
  RECRUITER_LOGO_COUNT,
  RECRUITERS_CTA,
} from "@/lib/recruiters-content";

const RECRUITERS_FAQ = [FAQ_DIRECTORY_ACCESS, FAQ_RECRUITING_COST, FAQ_INTERNSHIP_ONLY, FAQ_SHORTLISTING, ...RECRUITERS_FAQ_EXTRA];
const WHY_RECRUIT_ICONS: Record<FeatureItem["glyph"], LucideIcon> = {
  design: Compass,
  software: LayoutGrid,
  studio: Users,
  thinking: Lightbulb,
};
const IMAGE_TONES = ["violet", "amber", "cool"] as const;

/**
 * `/recruiters` (Version 2.0 editorial pass) — a pure Server Component,
 * same rationale as the other content pages.
 *
 * Still composed largely from content already written elsewhere (`Why
 * Recruit` from Home, capabilities/software from Students, the
 * engagement workflow and internship overview from Placements, four of
 * six FAQ items from Placements) — a recruiter reading this page
 * alongside the others sees one consistent set of claims. What changes
 * in this pass is the presentation: this page is deliberately given its
 * own B2B identity — compact spec panels, a comparison table for hiring
 * models, a checkmark support list — rather than reusing Students' exact
 * visual treatments for the same underlying data, per the brief's "don't
 * make Recruiters feel like Students with different text." Trust signals
 * (placement stats inline in the hero, a logo grid, honest testimonial
 * placeholders) are front-loaded, matching a recruiter's actual first
 * questions: is this credible, and is it easy.
 */
export default function RecruitersPage() {
  return (
    <>
      {/* 1 — Hero: the site's asymmetric split, with trust stats
          folded directly into the hero instead of a separate section —
          credibility signaled before any explanation. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <DataLabel className="text-(--color-accent)">{RECRUITERS_HERO.eyebrow}</DataLabel>
            <PageTitle className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl">
              {RECRUITERS_HERO.title}
            </PageTitle>
            <p className="mt-6 max-w-md text-base text-(--color-text-secondary) lg:text-lg">{RECRUITERS_HERO.subhead}</p>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-(--color-border) pt-6">
              {PLACEMENT_STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-text-primary)">{stat.value}</p>
                  <p className="text-xs text-(--color-text-secondary)">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <ImagePlaceholder label={RECRUITERS_HERO.imageLabel} aspect="auto" tone="bold" rounded={false} className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* 2 — Why Recruit: a light, icon-first feature row — no card
          borders, confident rather than academic. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Why Recruit From VNIT Architecture" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_RECRUIT_FEATURES.map((feature) => {
            const Icon = WHY_RECRUIT_ICONS[feature.glyph];
            return (
              <div key={feature.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
                  <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                </span>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <p className="mt-1.5 text-sm text-(--color-text-secondary)">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3 — Student Capabilities: bordered spec panels — the same
          data as Students' Skill Matrix, given a distinct, more formal
          "capability sheet" treatment for a B2B audience. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Student Capabilities" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKILL_MATRIX.map((category) => (
            <div key={category.category} className="rounded-2xl border-t-2 border-(--color-accent) bg-(--color-surface) p-5 shadow-sm">
              <DataLabel>{category.category}</DataLabel>
              <ul className="mt-3 space-y-2">
                {category.skills.map((skill) => (
                  <li key={skill} className="text-sm text-(--color-text-secondary)">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — Software Proficiency: a divided horizontal spec strip —
          distinct from both of Students' treatments for the same data. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Software Proficiency" />
        <div className="grid divide-y divide-(--color-border) border-y border-(--color-border) sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {SOFTWARE_ECOSYSTEM.map((item) => (
            <div key={item.tool} className="px-6 py-5 first:pl-0 last:pr-0">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold text-(--color-text-primary)">{item.tool}</p>
              <p className="mt-1 text-xs text-(--color-text-secondary)">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Recruitment Process: horizontal timeline. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Recruitment Process" />
        <ProcessSteps steps={RECRUITER_ENGAGEMENT_STEPS} />
      </Section>

      {/* 6 — Internship Engagement: image+text spread. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionIntro title="Internship Engagement" />
            <p className="text-(--color-text-secondary)">{INTERNSHIP_OVERVIEW}</p>
            <p className="mt-6 border-l-2 border-(--color-accent) pl-4 text-sm font-medium text-(--color-text-primary)">
              Many recruiters use an internship to evaluate a candidate before a full-time offer — see the
              Pre-Placement Internship model below.
            </p>
          </div>
          <ImagePlaceholder label="Replace Workshop Image" aspect="square" tone="cool" />
        </div>
      </Section>

      {/* 7 — Available Hiring Models: a single comparison panel, not
          four separate cards. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Available Hiring Models" />
        <div className="grid divide-y divide-(--color-border) rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {HIRING_MODELS.map((model) => (
            <div key={model.title} className="p-6">
              <CardTitle>{model.title}</CardTitle>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-(--color-text-secondary)">Commitment</dt>
                  <dd className="text-right font-medium text-(--color-text-primary)">{model.commitment}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-(--color-text-secondary)">Duration</dt>
                  <dd className="text-right font-medium text-(--color-text-primary)">{model.duration}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-(--color-text-secondary)">{model.bestFor}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Placement Support: a reassuring checkmark list. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Placement Support Provided by the Department" />
        <div className="grid gap-8 sm:grid-cols-2">
          {PLACEMENT_SUPPORT.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <CheckCircle2 aria-hidden="true" size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-(--color-success)" />
              <div>
                <CardTitle>{item.title}</CardTitle>
                <p className="mt-1 text-sm text-(--color-text-secondary)">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9 — Trusted By: an editable recruiter-logo grid plus honest
          testimonial placeholders — new to this page, never fabricated. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Trusted By" description="Recruiting partners and their teams' experience working with the department." />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {Array.from({ length: RECRUITER_LOGO_COUNT }).map((_, i) => (
            <ImagePlaceholder key={i} label="Replace Logo" aspect="square" tag={false} tone={IMAGE_TONES[i % IMAGE_TONES.length]} />
          ))}
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {RECRUITER_TESTIMONIALS.map((testimonial, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 shadow-sm">
              <ImagePlaceholder label={testimonial.imageLabel} aspect="square" tag={false} tone={IMAGE_TONES[i % IMAGE_TONES.length]} className="h-16 w-16 shrink-0" />
              <p className="text-sm font-medium text-(--color-text-secondary)">{testimonial.role}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 10 — FAQ: centered accordion. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Frequently Asked Questions" />
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={RECRUITERS_FAQ} />
        </div>
      </Section>

      {/* 11 — Closing: full-bleed band matching every other page. */}
      <section className="relative overflow-hidden">
        <ImagePlaceholder label={RECRUITERS_CTA.imageLabel} aspect="auto" tone="bold" rounded={false} minimal className="h-[22rem] w-full lg:h-[26rem]" />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <DataLabel className="text-white/80">{RECRUITERS_CTA.eyebrow}</DataLabel>
              <SectionHeading className="mt-3 text-3xl text-white lg:text-4xl">{RECRUITERS_CTA.title}</SectionHeading>
              <p className="mt-4 text-white/85">{RECRUITERS_CTA.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/contact" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Request Recruiter Access
                </Link>
                <Link
                  href="/placements"
                  className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90"
                >
                  See Placement Outcomes
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </>
  );
}
