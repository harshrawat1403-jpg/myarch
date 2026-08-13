import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { ProcessSteps } from "@/components/public/process-steps";
import { FaqAccordion } from "@/components/public/faq-accordion";
import {
  STUDENTS_HERO,
  ACADEMIC_JOURNEY_STEPS,
  STUDIO_CULTURE_ITEMS,
  SKILL_MATRIX,
  SOFTWARE_ECOSYSTEM,
  DESIGN_PROCESS_STEPS,
  PORTFOLIO_COMPONENTS,
  STUDENT_ACHIEVEMENTS,
  STUDENT_LIFE_PARAGRAPHS,
  STUDENT_LIFE_PULL_QUOTE,
  STUDENT_LIFE_IMAGE_LABEL,
  CAREER_PATHWAYS,
  STUDENTS_FAQ,
  STUDENTS_CTA,
} from "@/lib/students-content";

const IMAGE_TONES = ["violet", "amber", "cool"] as const;
const ACHIEVEMENT_TONE_CLASSES = [
  "text-(--color-accent)",
  "text-(--color-highlight)",
  "text-(--color-secondary)",
];

/**
 * `/students` (Version 2.0 editorial pass) — a pure Server Component, same
 * rationale as About and Placements.
 *
 * The most image-led page on the site — "the most emotional page," per
 * the brief: prospective students should picture themselves here. Studio
 * Culture and Portfolio Development lead with imagery (a 3-image gallery
 * and an offset collage, echoing Home's Featured Student Work) rather than
 * icon cards; Student Life pairs a large image with an oversized pull-
 * quote instead of a paragraph beside a card. Skills and Software Ecosystem
 * stay deliberately quiet and text-only — a rhythm break between the
 * image-heavy sections around them, not every section competing for the
 * same visual weight. Career Pathways reuses the manifesto-list shape
 * from Home's Why Recruit and About's Why VNIT — third use of a list of
 * reasons/options getting the identical treatment, by now the site's
 * established device for that content shape.
 */
export default function StudentsPage() {
  return (
    <>
      {/* 1 — Hero: same asymmetric shape as every other page. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <DataLabel className="text-(--color-accent)">{STUDENTS_HERO.eyebrow}</DataLabel>
            <PageTitle className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl">
              {STUDENTS_HERO.title}
            </PageTitle>
            <p className="mt-6 max-w-md text-base text-(--color-text-secondary) lg:text-lg">
              {STUDENTS_HERO.subhead}
            </p>
          </div>
          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <ImagePlaceholder
              label={STUDENTS_HERO.imageLabel}
              aspect="auto"
              tone="bold"
              rounded={false}
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      {/* 2 — Academic Journey: horizontal timeline. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Academic Journey" />
        <ProcessSteps steps={ACADEMIC_JOURNEY_STEPS} />
      </Section>

      {/* 3 — Studio Culture: an image-led gallery — the emotional heart
          of the page, shown rather than described. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Studio Culture" />
        <div className="grid gap-6 sm:grid-cols-3">
          {STUDIO_CULTURE_ITEMS.map((item, i) => (
            <div key={item.title}>
              <ImagePlaceholder
                label={item.imageLabel}
                aspect="square"
                tone={IMAGE_TONES[i % IMAGE_TONES.length]}
              />
              <CardTitle className="mt-4">{item.title}</CardTitle>
              <p className="mt-1.5 text-sm text-(--color-text-secondary)">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — Skills Students Develop: a quiet, text-only column list —
          a rhythm break between two image-heavy sections. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Skills Students Develop" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SKILL_MATRIX.map((category) => (
            <div key={category.category}>
              <DataLabel className="text-(--color-accent)">{category.category}</DataLabel>
              <ul className="mt-3 space-y-2">
                {category.skills.map((skill) => (
                  <li
                    key={skill}
                    className="flex items-center gap-2 text-sm text-(--color-text-secondary)"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 shrink-0 rounded-full bg-(--color-accent)"
                    />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Software Ecosystem: large confident badges, not a fifth
          column-grid section in a row — deliberately distinct from
          Skills' quiet list right above it. No icon library implies
          specific brand logos we don't have license to represent. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Software Ecosystem" />
        <div className="flex flex-wrap gap-3">
          {SOFTWARE_ECOSYSTEM.map((item) => (
            <div
              key={item.tool}
              className="rounded-2xl border border-(--color-border) bg-(--color-surface) px-6 py-4 shadow-sm"
            >
              <p className="font-[family-name:var(--font-display)] text-base font-semibold text-(--color-text-primary)">
                {item.tool}
              </p>
              <p className="mt-1 text-xs text-(--color-text-secondary)">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Design Process: a second horizontal timeline, separated
          from Academic Journey by four sections of different shapes. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Design Process" />
        <ProcessSteps steps={DESIGN_PROCESS_STEPS} />
      </Section>

      {/* 7 — Portfolio Development: an offset image collage, the same
          device as Home's Featured Student Work — literally the same
          kind of content (sample work), so it earns the same treatment. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro
          title="Portfolio Development"
          description="Built gradually, not assembled the week before placements."
        />
        {PORTFOLIO_COMPONENTS[0] && (
          <div className="relative mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <ImagePlaceholder
              label={`${PORTFOLIO_COMPONENTS[0].title} Photo`}
              aspect="wide"
              tone="bold"
              className="w-full shadow-lg lg:w-[76%]"
            />
            {PORTFOLIO_COMPONENTS[1] && (
              <div className="absolute -bottom-8 right-2 hidden w-[34%] sm:block lg:-bottom-10 lg:right-[6%]">
                <ImagePlaceholder
                  label={`${PORTFOLIO_COMPONENTS[1].title} Photo`}
                  aspect="square"
                  tone="amber"
                  className="w-full shadow-xl ring-4 ring-(--color-surface-muted)"
                />
              </div>
            )}
          </div>
        )}
        <div className="mt-14 grid gap-8 border-t border-(--color-border) pt-10 sm:grid-cols-3 lg:mt-20">
          {PORTFOLIO_COMPONENTS.map((component) => (
            <div key={component.title}>
              <CardTitle>{component.title}</CardTitle>
              <p className="mt-1.5 text-sm text-(--color-text-secondary)">
                {component.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Student Achievements: editorial list rows, the same shape
          as Home's Latest Updates. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Student Achievements" />
        <div className="divide-y divide-(--color-border) border-t border-(--color-border)">
          {STUDENT_ACHIEVEMENTS.map((achievement, i) => (
            <div
              key={achievement.title}
              className="flex flex-col gap-1.5 py-6 sm:flex-row sm:items-baseline sm:gap-10 sm:py-7"
            >
              <span
                className={`w-28 shrink-0 text-xs font-semibold uppercase tracking-wide ${ACHIEVEMENT_TONE_CLASSES[i % ACHIEVEMENT_TONE_CLASSES.length]}`}
              >
                {achievement.category}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">
                  {achievement.title}
                </h3>
                <p className="mt-1 text-sm text-(--color-text-secondary)">
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-(--color-text-secondary)">
          Illustrative categories — individual achievements are recognised as they occur.
        </p>
      </Section>

      {/* 9 — Student Life: a large image with an oversized pull-quote
          beneath it — the page's one big emotional statement. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Student Life" />
        <ImagePlaceholder label={STUDENT_LIFE_IMAGE_LABEL} aspect="wide" tone="violet" />
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl leading-snug text-(--color-text-primary) lg:text-3xl">
            &ldquo;{STUDENT_LIFE_PULL_QUOTE}&rdquo;
          </p>
          {STUDENT_LIFE_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-(--color-text-secondary)">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      {/* 10 — Career Pathways: the site's established manifesto-list
          shape for a list of options. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading className="text-balance text-3xl leading-tight lg:text-[2.25rem]">
            Career Pathways
          </SectionHeading>
          <div className="divide-y divide-(--color-border) border-t border-(--color-border) lg:border-t-0">
            {CAREER_PATHWAYS.map((pathway, i) => (
              <div
                key={pathway.title}
                className="flex items-center gap-6 py-6 first:pt-0 lg:first:pt-0"
              >
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-border) lg:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <CardTitle>{pathway.title}</CardTitle>
                  <p className="mt-1.5 text-sm text-(--color-text-secondary)">
                    {pathway.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 11 — FAQ: centered accordion. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Frequently Asked Questions" />
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={STUDENTS_FAQ} />
        </div>
      </Section>

      {/* 12 — Closing: full-bleed band matching every other page. */}
      <section className="relative overflow-hidden">
        <ImagePlaceholder
          label={STUDENTS_CTA.imageLabel}
          aspect="auto"
          tone="bold"
          rounded={false}
          minimal
          className="h-[22rem] w-full lg:h-[26rem]"
        />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <DataLabel className="text-white/80">{STUDENTS_CTA.eyebrow}</DataLabel>
              <SectionHeading className="mt-3 text-3xl text-white lg:text-4xl">
                {STUDENTS_CTA.title}
              </SectionHeading>
              <p className="mt-4 text-white/85">{STUDENTS_CTA.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/login" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Sign In
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
