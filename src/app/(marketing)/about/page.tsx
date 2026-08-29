import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { PageOverridesProvider } from "@/components/edit-mode/page-overrides-context";
import { EditableText } from "@/components/edit-mode/editable-text";
import { EditableImage } from "@/components/edit-mode/editable-image";
import { getPageContentOverridesUseCase } from "@/modules/content-overrides";
import {
  ABOUT_HERO,
  VISION_MISSION,
  HISTORY_PARAGRAPHS,
  HISTORY_PULL_QUOTE,
  HISTORY_IMAGE_LABEL,
  PHILOSOPHY_PARAGRAPH,
  PHILOSOPHY_PULL_LINE,
  STUDIO_CULTURE_TRAITS,
  STUDIO_CULTURE_IMAGE_LABEL,
  FACILITIES,
  FACULTY_PLACEHOLDER_MESSAGE,
  FACULTY_IMAGE_LABEL,
  WHY_VNIT_REASONS,
  ABOUT_CTA,
} from "@/lib/about-content";

// MYARCH Edit Mode: this page reads live content overrides on every
// request — without this, Next would statically prerender it once at
// build time (no dynamic API triggers opt-out on its own), and a Publish
// would never actually reach visitors until the next deploy.
export const dynamic = "force-dynamic";

const FACILITY_TONES = ["violet", "cool", "amber", "cool"] as const;
const PAGE = "about";

/**
 * `/about` (Version 2.0 editorial pass) — an async Server Component (MYARCH
 * Edit Mode): the one addition here is a single server-side read of this
 * page's saved content overrides, resolved once and threaded into
 * `EditableText`/`EditableImage` in place of the bare `{CONSTANT}`
 * interpolations they replace. With zero overrides saved, every field
 * renders the exact same developer-authored copy as before — the page's
 * own structure, layout, and components are completely unchanged.
 *
 * Inherits Home's design language rather than reinventing one: the same
 * asymmetric hero shape, the same "manifesto list" for Why Architecture at
 * VNIT (structurally identical content to Home's Why Recruit — title +
 * description reasons — so it gets the identical treatment), the same
 * bespoke full-bleed closing band instead of the shared `CtaPanel`. What's
 * new here, specific to this page's purpose, is the alternating image/text
 * rhythm through History, Studio Culture, and Faculty — About is the one
 * page that's fundamentally about the department's physical and cultural
 * reality, so imagery carries more of the storytelling than Home's numbers
 * and actions do. `SectionHeader` (the V1.1 "Sheet 0X/0Y" motif) and
 * `FeatureCard`/`FeatureGlyph` are retired here, same as Home; both remain
 * exactly as they were for Students/Recruiters/Contact, not yet through
 * their own pass.
 */
export default async function AboutPage() {
  const overrides = await getPageContentOverridesUseCase.execute(PAGE);

  return (
    <PageOverridesProvider page={PAGE} overrides={overrides}>
      {/* 1 — Hero: same asymmetric shape as Home's — text carries the
          statement, a full-bleed image fills the other half. */}
      <section className="relative overflow-hidden bg-(--color-surface)">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
            <EditableText contentKey="hero.eyebrow" defaultValue={ABOUT_HERO.eyebrow} as="label" className="text-(--color-accent)" />
            <EditableText
              contentKey="hero.title"
              defaultValue={ABOUT_HERO.title}
              as="h1"
              className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight lg:text-6xl"
            />
            <EditableText
              contentKey="hero.subhead"
              defaultValue={ABOUT_HERO.subhead}
              as="p"
              multiline
              className="mt-6 block max-w-md text-base text-(--color-text-secondary) lg:text-lg"
            />
          </div>
          <div className="h-[20rem] sm:h-[26rem] lg:h-auto">
            <EditableImage
              contentKey="hero.image"
              className="h-full w-full"
              fallback={
                <ImagePlaceholder label={ABOUT_HERO.imageLabel} aspect="auto" tone="bold" rounded={false} className="h-full w-full" />
              }
            />
          </div>
        </div>
      </section>

      {/* 2 — Vision & Mission: a plain typographic band, no cards — two
          columns of statement-sized text on a tinted background. */}
      <section className="border-y border-(--color-border) bg-(--color-surface-muted)">
        <PageContainer className="py-14 lg:py-20">
          <SectionHeading className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-text-secondary)">
            Vision &amp; Mission
          </SectionHeading>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-16">
            {VISION_MISSION.map((item, i) => (
              <div key={item.label}>
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-accent)">{item.label}</p>
                <EditableText
                  contentKey={`visionMission.${i}.body`}
                  defaultValue={item.body}
                  as="p"
                  multiline
                  className="mt-3 block text-xl leading-snug text-(--color-text-primary) lg:text-2xl"
                />
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* 3 — History: image beside text, the first of the page's
          alternating editorial spreads. */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <EditableImage
            contentKey="history.image"
            fallback={<ImagePlaceholder label={HISTORY_IMAGE_LABEL} aspect="square" tone="amber" />}
          />
          <div>
            <SectionIntro title="History" />
            <div className="space-y-4 text-(--color-text-secondary)">
              {HISTORY_PARAGRAPHS.map((paragraph, i) => (
                <EditableText key={i} contentKey={`history.paragraph.${i}`} defaultValue={paragraph} as="p" multiline className="block" />
              ))}
            </div>
            <EditableText
              contentKey="history.pullQuote"
              defaultValue={HISTORY_PULL_QUOTE}
              as="p"
              className="mt-6 block border-l-2 border-(--color-accent) pl-4 font-[family-name:var(--font-display)] text-lg italic text-(--color-text-primary)"
            />
          </div>
        </div>
      </Section>

      {/* 4 — Academic Philosophy: a quiet, text-only, centered moment —
          deliberate contrast with the image-paired sections around it. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface)">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading className="text-2xl lg:text-3xl">Academic Philosophy</SectionHeading>
          <EditableText
            contentKey="philosophy.paragraph"
            defaultValue={PHILOSOPHY_PARAGRAPH}
            as="p"
            multiline
            className="mt-6 block text-(--color-text-secondary)"
          />
          <EditableText
            contentKey="philosophy.pullLine"
            defaultValue={PHILOSOPHY_PULL_LINE}
            as="p"
            className="mt-6 block font-[family-name:var(--font-display)] text-xl text-(--color-accent) lg:text-2xl"
          />
        </div>
      </Section>

      {/* 5 — Studio Culture: a manifesto-style list beside an image —
          the same numbered-list device Home uses, paired with imagery
          since this section is about a physical, shared space. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionIntro title="Studio Culture" />
            <div className="divide-y divide-(--color-border) border-t border-(--color-border)">
              {STUDIO_CULTURE_TRAITS.map((trait, i) => (
                <div key={trait.title} className="flex items-center gap-6 py-5 first:pt-0">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-border)">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <EditableText contentKey={`studioCulture.${i}.title`} defaultValue={trait.title} as="h3" />
                    <EditableText
                      contentKey={`studioCulture.${i}.description`}
                      defaultValue={trait.description}
                      as="p"
                      multiline
                      className="mt-1 block text-sm text-(--color-text-secondary)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <EditableImage
            contentKey="studioCulture.image"
            fallback={<ImagePlaceholder label={STUDIO_CULTURE_IMAGE_LABEL} aspect="square" tone="violet" />}
          />
        </div>
      </Section>

      {/* 6 — Facilities: an image gallery row — four equal, image-led
          tiles rather than four small icon cards. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro
          title="Facilities Overview"
          description="Representative facilities — exact inventory is confirmed department-side."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FACILITIES.map((facility, i) => (
            <div key={facility.title}>
              <EditableImage
                contentKey={`facilities.${i}.image`}
                fallback={<ImagePlaceholder label={`${facility.title} Photo`} aspect="square" tone={FACILITY_TONES[i % FACILITY_TONES.length]} />}
              />
              <EditableText contentKey={`facilities.${i}.title`} defaultValue={facility.title} as="h3" className="mt-4" />
              <EditableText
                contentKey={`facilities.${i}.description`}
                defaultValue={facility.description}
                as="p"
                multiline
                className="mt-1.5 block text-sm text-(--color-text-secondary)"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 7 — Faculty: a small, honest editorial moment for a section
          with no real data yet — image beside a short message, not a
          centered "no data" card. */}
      <Section className="border-t border-(--color-border)">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <EditableImage contentKey="faculty.image" fallback={<ImagePlaceholder label={FACULTY_IMAGE_LABEL} aspect="video" tone="cool" />} />
          <div>
            <SectionHeading className="text-2xl lg:text-3xl">Faculty</SectionHeading>
            <EditableText
              contentKey="faculty.message"
              defaultValue={FACULTY_PLACEHOLDER_MESSAGE}
              as="p"
              multiline
              className="mt-4 block text-(--color-text-secondary)"
            />
            <Link href="/contact" className={buttonClassName("secondary", "mt-6")}>
              Contact the Department
            </Link>
          </div>
        </div>
      </Section>

      {/* 8 — Why Architecture at VNIT: the same manifesto-list shape as
          Home's Why Recruit — structurally identical content (a list of
          reasons), so it earns the identical treatment. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading className="text-balance text-3xl leading-tight lg:text-[2.25rem]">
            Why Architecture at VNIT
          </SectionHeading>
          <div className="divide-y divide-(--color-border) border-t border-(--color-border) lg:border-t-0">
            {WHY_VNIT_REASONS.map((reason, i) => (
              <div key={reason.title} className="flex items-center gap-6 py-6 first:pt-0 lg:first:pt-0">
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-border) lg:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <EditableText contentKey={`whyVnit.${i}.title`} defaultValue={reason.title} as="h3" />
                  <EditableText
                    contentKey={`whyVnit.${i}.description`}
                    defaultValue={reason.description}
                    as="p"
                    multiline
                    className="mt-1.5 block text-sm text-(--color-text-secondary)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 9 — Closing: the same full-bleed color band as Home's, not the
          shared `CtaPanel` boxed panel. */}
      <section className="relative overflow-hidden">
        <EditableImage
          contentKey="cta.image"
          className="h-[22rem] w-full lg:h-[26rem]"
          fallback={
            <ImagePlaceholder label={ABOUT_CTA.imageLabel} aspect="auto" tone="bold" rounded={false} minimal className="h-[22rem] w-full lg:h-[26rem]" />
          }
        />
        <div className="absolute inset-0 flex items-center">
          <PageContainer>
            <div className="max-w-xl">
              <EditableText contentKey="cta.eyebrow" defaultValue={ABOUT_CTA.eyebrow} as="label" className="text-white/80" />
              <EditableText contentKey="cta.title" defaultValue={ABOUT_CTA.title} as="h2" className="mt-3 text-3xl text-white lg:text-4xl" />
              <EditableText
                contentKey="cta.description"
                defaultValue={ABOUT_CTA.description}
                as="p"
                multiline
                className="mt-4 block text-white/85"
              />
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/placements" className={buttonClassName("secondary", "px-8 py-3 text-base")}>
                  See Placement Outcomes
                </Link>
                <Link
                  href="/students"
                  className="text-sm font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline hover:opacity-90"
                >
                  Meet Our Students
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </section>
    </PageOverridesProvider>
  );
}
