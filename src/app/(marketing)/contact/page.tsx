import { Suspense } from "react";
import Link from "next/link";
import { Building2, GraduationCap, HelpCircle, type LucideIcon } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTitle, SectionHeading, DataLabel, CardTitle } from "@/components/ui/typography";
import { Section } from "@/components/public/section";
import { PageContainer } from "@/components/public/page-container";
import { ImagePlaceholder } from "@/components/public/image-placeholder";
import { SectionIntro } from "@/components/public/section-intro";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { ContactForm } from "@/components/public/contact-form";
import { DEPARTMENT_EMAIL } from "@/lib/public-content";
import {
  CONTACT_HERO,
  CONTACT_PANELS,
  OFFICE_ADDRESS_LINES,
  OFFICE_HOURS,
  OFFICE_HOURS_NOTE,
  ACCESSIBILITY_NOTE,
  LOCATION_IMAGE_LABEL,
  ENQUIRY_ROUTES,
  CONTACT_FAQ,
  CONTACT_CTA,
  TPO_EMAIL,
} from "@/lib/contact-content";

const ROUTE_ICONS: LucideIcon[] = [HelpCircle, Building2, GraduationCap];

/**
 * `/contact` (Version 2.0 editorial pass) — a Server Component apart from
 * `ContactForm` (client state + `useSearchParams`, wrapped in `Suspense`
 * per the App Router's requirement).
 *
 * Deliberately the one page in the pass that does NOT open with a
 * full-bleed image or close with a color band — the brief calls this
 * "the calmest page on the website," purpose is removing friction, not
 * impressing. A plain centered hero, no image; a quiet text-only closing
 * instead of every other page's saturated band. Section order changed
 * from the original: the contact form moves up to sit right after who to
 * email, becoming the page's obvious central action, rather than being
 * the second-to-last thing a visitor scrolls to. The "map integration
 * pending" honesty note (no fabricated embed) is preserved verbatim, now
 * as a large `ImagePlaceholder` rather than a small bordered box.
 */
export default function ContactPage() {
  return (
    <>
      {/* 1 — Hero: centered, no image — calm by design. */}
      <section className="bg-(--color-surface)">
        <PageContainer className="py-20 text-center lg:py-28">
          <DataLabel className="text-center text-(--color-accent)">{CONTACT_HERO.eyebrow}</DataLabel>
          <PageTitle className="mx-auto mt-5 max-w-2xl text-balance text-4xl leading-[1.05] lg:text-5xl">{CONTACT_HERO.title}</PageTitle>
          <p className="mx-auto mt-6 max-w-xl text-base text-(--color-text-secondary) lg:text-lg">{CONTACT_HERO.subhead}</p>
        </PageContainer>
      </section>

      {/* 2 — Contact Information: two clean, actionable tiles. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Contact Information" />
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT_PANELS.map((panel) => (
            <Card key={panel.label} className="p-8">
              <DataLabel>{panel.label}</DataLabel>
              <p className="mt-2 text-sm text-(--color-text-secondary)">{panel.description}</p>
              <a href={`mailto:${panel.email}`} className="mt-4 inline-block text-sm font-medium text-(--color-accent) hover:underline">
                {panel.email}
              </a>
            </Card>
          ))}
        </div>
      </Section>

      {/* 3 — Send a Message: the visual centerpiece. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Send a Message" />
        <div className="mx-auto max-w-xl">
          <Suspense fallback={<Card className="p-8">Loading form…</Card>}>
            <ContactForm contactEmail={DEPARTMENT_EMAIL} />
          </Suspense>
        </div>
      </Section>

      {/* 4 — Who To Contact: a light, borderless icon row. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Who To Contact" />
        <div className="grid gap-8 sm:grid-cols-3">
          {ENQUIRY_ROUTES.map((route, i) => {
            const Icon = ROUTE_ICONS[i];
            return (
              <div key={route.title}>
                {Icon && <Icon aria-hidden="true" size={22} strokeWidth={1.75} className="text-(--color-accent)" />}
                <CardTitle className="mt-3">{route.title}</CardTitle>
                <p className="mt-1.5 text-sm text-(--color-text-secondary)">{route.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5 — Office Location & Hours: a premium location section — a
          large image slot instead of a tiny embedded map box. */}
      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <SectionIntro title="Office Location & Hours" />
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <ImagePlaceholder label={LOCATION_IMAGE_LABEL} aspect="square" tone="cool" />
          <div>
            <DataLabel>Address</DataLabel>
            <address className="mt-2 text-sm not-italic text-(--color-text-secondary)">
              {OFFICE_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>

            <DataLabel className="mt-6">Office Hours</DataLabel>
            <p className="mt-2 text-sm text-(--color-text-secondary)">{OFFICE_HOURS}</p>
            <p className="mt-1 text-xs text-(--color-text-secondary)">{OFFICE_HOURS_NOTE}</p>

            <p className="mt-6 border-l-2 border-(--color-accent) pl-4 text-xs text-(--color-text-secondary)">{ACCESSIBILITY_NOTE}</p>
          </div>
        </div>
      </Section>

      {/* 6 — FAQ: centered accordion. */}
      <Section className="border-t border-(--color-border)">
        <SectionIntro title="Frequently Asked Questions" />
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={CONTACT_FAQ} />
        </div>
      </Section>

      {/* 7 — Closing: quiet and text-only, not a color band — the page
          ends the same way it started. */}
      <section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <PageContainer className="py-20 text-center lg:py-28">
          <SectionHeading className="mx-auto max-w-xl text-2xl lg:text-3xl">{CONTACT_CTA.title}</SectionHeading>
          <p className="mx-auto mt-4 max-w-md text-(--color-text-secondary)">{CONTACT_CTA.description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <Link href={`mailto:${TPO_EMAIL}`} className={buttonClassName("primary", "px-8 py-3 text-base")}>
              Email the Placement Cell
            </Link>
            <Link
              href="/placements"
              className="text-sm font-semibold text-(--color-text-primary) underline-offset-4 transition-colors duration-150 hover:text-(--color-accent) hover:underline"
            >
              Browse Placements
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
