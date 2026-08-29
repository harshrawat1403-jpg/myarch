import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { ProcessSteps } from "@/components/public/process-steps";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { PageOverridesProvider } from "@/components/edit-mode/page-overrides-context";
import { EditableText } from "@/components/edit-mode/editable-text";
import { EditableImage } from "@/components/edit-mode/editable-image";
import { getPageContentOverridesUseCase } from "@/modules/content-overrides";
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

// MYARCH Edit Mode: read live content overrides on every request — see
// /about's own doc comment for why (otherwise a Publish never reaches
// visitors until the next deploy).
export const dynamic = "force-dynamic";

const IMAGE_TONES = ["violet", "amber", "cool"] as const;
const ACHIEVEMENT_TONE_CLASSES = ["text-(--color-accent)", "text-(--color-highlight)", "text-(--color-secondary)"];
const PAGE = "students";

/**
 * `/students` (Version 2.0 editorial pass) — an async Server Component
 * (MYARCH Edit Mode), same pattern as `/about`/`/placements`. Editable:
 * hero, Studio Culture (image+title+description ×3), Portfolio Development
 * (the two collage images + title/description ×3), Student Life (image +
 * pull-quote + paragraphs), Career Pathways (title+description ×4), and the
 * closing band. Left as static prose/data for this pass (see `/placements`'
 * own doc comment for the same reasoning): the two `ProcessSteps` timelines,
 * `FaqAccordion`, the Skills matrix bullet lists, Software Ecosystem badges,
 * and Student Achievements rows — dense structured content, not the
 * heading/paragraph/image shape Edit Mode v1 targets.
 */
export default async function StudentsPage() {
  const overrides = await getPageContentOverridesUseCase.execute(PAGE);

  return (
    <PageOverridesProvider page={PAGE} overrides={overrides}>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <EditableText contentKey="hero.eyebrow" defaultValue={STUDENTS_HERO.eyebrow} as="label" className="text-(--color-accent)" />
            <EditableText
              contentKey="hero.title"
              defaultValue={STUDENTS_HERO.title}
              as="h1"
              className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl"
            />
            <EditableText
              contentKey="hero.subhead"
              defaultValue={STUDENTS_HERO.subhead}
              as="p"
              multiline
              className="mt-6 block max-w-md text-base text-(--color-text-secondary) lg:text-lg"
            />
          </div>
          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <EditableImage
              contentKey="hero.image"
              className="h-full w-full"
              fallback={<ImagePlaceholder label={STUDENTS_HERO.imageLabel} aspect="auto" tone="bold" rounded={false} className="h-full w-full" />}
            />
          </div>
        </div>
      </section>

      {/* 2 — Academic Journey */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Academic Journey" />
        <ProcessSteps steps={ACADEMIC_JOURNEY_STEPS} />
      </Section>

      {/* 3 — Studio Culture: an image-led gallery. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Studio Culture" />
        <div className="grid gap-6 sm:grid-cols-3">
          {STUDIO_CULTURE_ITEMS.map((item, i) => (
            <div key={item.title}>
              <EditableImage contentKey={`studioCulture.${i}.image`} fallback={<ImagePlaceholder label={item.imageLabel} aspect="square" tone={IMAGE_TONES[i % IMAGE_TONES.length]} />} />
              <EditableText contentKey={`studioCulture.${i}.title`} defaultValue={item.title} as="h3" className="mt-4" />
              <EditableText contentKey={`studioCulture.${i}.description`} defaultValue={item.description} as="p" multiline className="mt-1.5 block text-sm text-(--color-text-secondary)" />
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — Skills Students Develop (not editable this pass). */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Skills Students Develop" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SKILL_MATRIX.map((category) => (
            <div key={category.category}>
              <DataLabel className="text-(--color-accent)">{category.category}</DataLabel>
              <ul className="mt-3 space-y-2">
                {category.skills.map((skill) => (
                  <li key={skill} className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-(--color-accent)" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Software Ecosystem (not editable this pass). */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Software Ecosystem" />
        <div className="flex flex-wrap gap-3">
          {SOFTWARE_ECOSYSTEM.map((item) => (
            <div key={item.tool} className="rounded-2xl border border-(--color-border) bg-(--color-surface) px-6 py-4 shadow-sm">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold text-(--color-text-primary)">{item.tool}</p>
              <p className="mt-1 text-xs text-(--color-text-secondary)">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Design Process */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Design Process" />
        <ProcessSteps steps={DESIGN_PROCESS_STEPS} />
      </Section>

      {/* 7 — Portfolio Development: an offset image collage. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Portfolio Development" description="Built gradually, not assembled the week before placements." />
        {PORTFOLIO_COMPONENTS[0] && (
          <div className="relative mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <EditableImage
              contentKey="portfolio.leadImage"
              className="w-full lg:w-[76%]"
              fallback={<ImagePlaceholder label={`${PORTFOLIO_COMPONENTS[0].title} Photo`} aspect="wide" tone="bold" className="w-full shadow-lg lg:w-[76%]" />}
            />
            {PORTFOLIO_COMPONENTS[1] && (
              <div className="absolute -bottom-8 right-2 hidden w-[34%] sm:block lg:-bottom-10 lg:right-[6%]">
                <EditableImage
                  contentKey="portfolio.sideImage"
                  className="w-full"
                  fallback={<ImagePlaceholder label={`${PORTFOLIO_COMPONENTS[1].title} Photo`} aspect="square" tone="amber" className="w-full shadow-xl ring-4 ring-(--color-surface-muted)" />}
                />
              </div>
            )}
          </div>
        )}
        <div className="mt-14 grid gap-8 border-t border-(--color-border) pt-10 sm:grid-cols-3 lg:mt-20">
          {PORTFOLIO_COMPONENTS.map((component, i) => (
            <div key={component.title}>
              <EditableText contentKey={`portfolio.${i}.title`} defaultValue={component.title} as="h3" />
              <EditableText contentKey={`portfolio.${i}.description`} defaultValue={component.description} as="p" multiline className="mt-1.5 block text-sm text-(--color-text-secondary)" />
            </div>
          ))}
        </div>
      </Section>

      {/* 8 — Student Achievements (not editable this pass). */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Student Achievements" />
        <div className="divide-y divide-(--color-border) border-t border-(--color-border)">
          {STUDENT_ACHIEVEMENTS.map((achievement, i) => (
            <div key={achievement.title} className="flex flex-col gap-1.5 py-6 sm:flex-row sm:items-baseline sm:gap-10 sm:py-7">
              <span className={`w-28 shrink-0 text-xs font-semibold uppercase tracking-wide ${ACHIEVEMENT_TONE_CLASSES[i % ACHIEVEMENT_TONE_CLASSES.length]}`}>
                {achievement.category}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">{achievement.title}</h3>
                <p className="mt-1 text-sm text-(--color-text-secondary)">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-(--color-text-secondary)">Illustrative categories — individual achievements are recognised as they occur.</p>
      </Section>

      {/* 9 — Student Life: a large image with an oversized pull-quote. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Student Life" />
        <EditableImage contentKey="studentLife.image" fallback={<ImagePlaceholder label={STUDENT_LIFE_IMAGE_LABEL} aspect="wide" tone="violet" />} />
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <EditableText
            contentKey="studentLife.pullQuote"
            defaultValue={STUDENT_LIFE_PULL_QUOTE}
            as="p"
            multiline
            className="block font-[family-name:var(--font-display)] text-2xl leading-snug text-(--color-text-primary) lg:text-3xl"
          />
          {STUDENT_LIFE_PARAGRAPHS.map((paragraph, i) => (
            <EditableText key={i} contentKey={`studentLife.paragraph.${i}`} defaultValue={paragraph} as="p" multiline className="mt-4 block text-(--color-text-secondary)" />
          ))}
        </div>
      </Section>

      {/* 10 — Career Pathways: the site's established manifesto-list shape. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading className="text-balance text-3xl leading-tight lg:text-[2.25rem]">Career Pathways</SectionHeading>
          <div className="divide-y divide-(--color-border) border-t border-(--color-border) lg:border-t-0">
            {CAREER_PATHWAYS.map((pathway, i) => (
              <div key={pathway.title} className="flex items-center gap-6 py-6 first:pt-0 lg:first:pt-0">
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-border) lg:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <EditableText contentKey={`careerPathways.${i}.title`} defaultValue={pathway.title} as="h3" />
                  <EditableText contentKey={`careerPathways.${i}.description`} defaultValue={pathway.description} as="p" multiline className="mt-1.5 block text-sm text-(--color-text-secondary)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 11 — FAQ (not editable this pass). */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Frequently Asked Questions" />
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={STUDENTS_FAQ} />
        </div>
      </Section>

      {/* 12 — Closing */}
      <section className="relative overflow-hidden">
        <EditableImage
          contentKey="cta.image"
          className="h-[22rem] w-full lg:h-[26rem]"
          fallback={<ImagePlaceholder label={STUDENTS_CTA.imageLabel} aspect="auto" tone="bold" rounded={false} minimal className="h-[22rem] w-full lg:h-[26rem]" />}
        />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <EditableText contentKey="cta.eyebrow" defaultValue={STUDENTS_CTA.eyebrow} as="label" className="text-white/80" />
              <EditableText contentKey="cta.title" defaultValue={STUDENTS_CTA.title} as="h2" className="mt-3 text-3xl text-white lg:text-4xl" />
              <EditableText contentKey="cta.description" defaultValue={STUDENTS_CTA.description} as="p" multiline className="mt-4 block text-white/85" />
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/login" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  Sign In
                </Link>
                <Link href="/placements" className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90">
                  See Placement Outcomes
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </PageOverridesProvider>
  );
}
