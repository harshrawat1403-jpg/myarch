import Link from "next/link";
import { Award, Building2, CircleUser, ClipboardList, LogIn, Users2, Wallet, type LucideIcon } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { QuickActionCard } from "@/components/public/quick-action-card";
import { PageOverridesProvider } from "@/components/edit-mode/page-overrides-context";
import { EditableText } from "@/components/edit-mode/editable-text";
import { EditableImage } from "@/components/edit-mode/editable-image";
import { getPageContentOverridesUseCase } from "@/modules/content-overrides";
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
const UPDATE_TONE_CLASSES = ["text-(--color-accent)", "text-(--color-highlight)", "text-(--color-secondary)"];
const PAGE = "home";

/**
 * The actual marketing content for `/` — split out of `page.tsx` (MYARCH
 * Edit Mode) because `page.tsx` is `"use client"` (it needs `useAuth()` to
 * redirect an already-logged-in visitor) and can't do the server-side
 * content-override read directly. `page.tsx` renders this component only
 * once `!isLoading && !isAuthenticated`; every other target page fetches
 * its own overrides inline since none of them need that redirect check.
 *
 * Editable: hero, About panel, and the closing band. Featured Student Work
 * project captions and Latest Updates are left static this pass (same
 * "dense structured data" reasoning as the other pages) — Why Recruit and
 * Quick Actions likewise.
 */
export default async function HomeMarketingContent() {
  const overrides = await getPageContentOverridesUseCase.execute(PAGE);
  const [leadProject, sideProject] = FEATURED_PROJECTS;

  return (
    <PageOverridesProvider page={PAGE} overrides={overrides}>
      {/* 1 — Hero: asymmetric split. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <EditableText contentKey="hero.eyebrow" defaultValue={HOME_HERO.eyebrow} as="label" className="text-(--color-accent)" />
            <EditableText
              contentKey="hero.headline"
              defaultValue={HOME_HERO.headline}
              as="h1"
              className="mt-6 text-5xl font-bold leading-[1.03] tracking-tight lg:text-[5rem]"
            />
            <EditableText
              contentKey="hero.subhead"
              defaultValue={HOME_HERO.subhead}
              as="p"
              multiline
              className="mt-6 block max-w-md text-base text-(--color-text-secondary) lg:text-lg"
            />
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href="/placements" className={buttonClassName("primary", "px-8 py-3 text-base")}>
                Explore Placements
              </Link>
              <Link href="/login" className="text-sm font-semibold text-(--color-text-primary) underline-offset-4 transition-colors duration-150 hover:text-(--color-accent) hover:underline">
                Sign In<span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>

          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <EditableImage
              contentKey="hero.image"
              className="h-full w-full"
              fallback={<ImagePlaceholder label={HOME_HERO.imageLabel} aspect="auto" tone="bold" rounded={false} className="h-full w-full" />}
            />
          </div>
        </div>
      </section>

      {/* 2 — Stats (not editable this pass). */}
      <section className="border-y border-(--color-border) bg-(--color-surface-muted)">
        <PageContainer className="py-14 lg:py-20">
          <SectionHeading className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-text-secondary)">
            Placement Highlights
          </SectionHeading>
          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {PLACEMENT_STATS.map((stat, i) => {
              const StatIcon = STAT_ICONS[i];
              return (
                <div key={stat.label} className="sm:border-l sm:border-(--color-border) sm:pl-8 sm:first:border-l-0 sm:first:pl-0">
                  {StatIcon && <StatIcon aria-hidden="true" size={22} strokeWidth={1.75} className="text-(--color-accent)" />}
                  <p className="mt-3 font-[family-name:var(--font-display)] text-6xl font-bold tracking-tight text-(--color-text-primary) lg:text-7xl">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium text-(--color-text-primary)">{stat.label}</p>
                  <p className="mt-1 text-xs text-(--color-text-secondary)">{stat.scope}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-xs text-(--color-text-secondary)">{STATS_CAPTION}</p>
        </PageContainer>
      </section>

      {/* 3 — Recruiting Partners tag row (not editable this pass). */}
      <div className="bg-(--color-surface) py-8">
        <PageContainer>
          <DataLabel>Recruiting Partners Include</DataLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {RECRUITING_CATEGORIES.map((category) => (
              <span key={category} className="rounded-full border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-secondary)">
                {category}
              </span>
            ))}
          </div>
        </PageContainer>
      </div>

      {/* 4 — Why Recruit (not editable this pass). */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading className="text-balance text-3xl leading-tight lg:text-[2.25rem]">Why Recruit From VNIT Architecture</SectionHeading>
          <div className="divide-y divide-(--color-border) border-t border-(--color-border) lg:border-t-0">
            {WHY_RECRUIT_FEATURES.map((feature, i) => (
              <div key={feature.title} className="flex items-center gap-6 py-6 first:pt-0 lg:first:pt-0">
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-border) lg:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <CardTitle>{feature.title}</CardTitle>
                  <p className="mt-1.5 text-sm text-(--color-text-secondary)">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 5 — About: a full-bleed image with the text panel overlapping its lower edge. */}
      <section className="relative bg-(--color-surface)">
        <EditableImage
          contentKey="about.image"
          className="h-[26rem] w-full lg:h-[32rem]"
          fallback={<ImagePlaceholder label={HOME_ABOUT.imageLabel} aspect="auto" tone="cool" rounded={false} className="h-[26rem] w-full lg:h-[32rem]" />}
        />
        <PageContainer>
          <Card className="relative z-10 -mt-20 max-w-lg shadow-lg lg:-mt-28 lg:p-10">
            <SectionHeading className="text-2xl lg:text-3xl">About the Department</SectionHeading>
            <EditableText contentKey="about.paragraph" defaultValue={HOME_ABOUT.paragraph} as="p" multiline className="mt-4 block text-(--color-text-secondary)" />
            <div className="mt-6 rounded-2xl bg-(--color-accent-soft) p-5">
              <EditableText contentKey="about.visionLabel" defaultValue={HOME_ABOUT.visionLabel} as="label" className="text-(--color-accent)" />
              <EditableText contentKey="about.visionText" defaultValue={HOME_ABOUT.visionText} as="p" multiline className="mt-2 block text-sm text-(--color-text-primary)" />
            </div>
          </Card>
        </PageContainer>
      </section>

      {/* 6 — Featured Student Work (not editable this pass). */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Featured Student Work" description={SHOWCASE_INTRO} />
        {leadProject && (
          <div className="relative mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <ImagePlaceholder label={`${leadProject.title} Photo`} aspect="wide" tone="bold" className="w-full shadow-lg lg:w-[76%]" />
            {sideProject && (
              <div className="absolute -bottom-8 right-2 hidden w-[34%] sm:block lg:-bottom-10 lg:right-[6%]">
                <ImagePlaceholder label={`${sideProject.title} Photo`} aspect="square" tone="amber" className="w-full shadow-xl ring-4 ring-(--color-surface-muted)" />
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

      {/* 7 — Latest Updates (not editable this pass). */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Latest Updates" />
        <div className="divide-y divide-(--color-border) border-t border-(--color-border)">
          {LATEST_UPDATES.map((update, i) => (
            <div key={update.title} className="flex flex-col gap-1.5 py-6 sm:flex-row sm:items-baseline sm:gap-10 sm:py-7">
              <span className={`w-28 shrink-0 text-xs font-semibold uppercase tracking-wide ${UPDATE_TONE_CLASSES[i % UPDATE_TONE_CLASSES.length]}`}>{update.category}</span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">{update.title}</h3>
                <p className="mt-1 text-sm text-(--color-text-secondary)">{update.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Quick Actions (not editable — application entry points, not marketing copy). */}
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

      {/* 9 — Closing */}
      <section className="relative overflow-hidden">
        <EditableImage
          contentKey="cta.image"
          className="h-[22rem] w-full lg:h-[26rem]"
          fallback={<ImagePlaceholder label={HOME_CTA.imageLabel} aspect="auto" tone="bold" rounded={false} minimal className="h-[22rem] w-full lg:h-[26rem]" />}
        />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <EditableText contentKey="cta.eyebrow" defaultValue={HOME_CTA.eyebrow} as="label" className="text-white/80" />
              <EditableText contentKey="cta.title" defaultValue={HOME_CTA.title} as="h2" className="mt-3 text-3xl text-white lg:text-4xl" />
              <EditableText contentKey="cta.description" defaultValue={HOME_CTA.description} as="p" multiline className="mt-4 block text-white/85" />
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/login" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Sign In
                </Link>
                <Link href="/contact" className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90">
                  Request Recruiter Access
                </Link>
                <Link href="/placements" className="text-sm font-semibold text-white/80 underline-offset-4 transition-colors duration-150 hover:text-white hover:underline">
                  Explore Placements
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </PageOverridesProvider>
  );
}
