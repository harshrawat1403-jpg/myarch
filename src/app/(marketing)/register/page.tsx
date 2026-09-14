import { DataLabel, PageTitle } from "@/components/ui/typography";
import { PageContainer } from "@/components/public/page-container";
import { Section } from "@/components/public/section";
import { RegistrationForm } from "@/components/public/registration-form";

/**
 * `/register` (V4.0 B1) — the public, unauthenticated student registration
 * entry point (docs/planning/V4_0_PRD.md §7 step 2). Deliberately simple —
 * a utility page for submitting a `RegistrationRequest`, not an editorial
 * marketing page, so it skips the hero/FAQ/closing-band sections every
 * content page under `(marketing)` uses.
 */
export default function RegisterPage() {
  return (
    <>
      <section className="bg-(--color-surface)">
        <PageContainer className="py-16 text-center lg:py-20">
          <DataLabel className="text-center text-(--color-accent)">Admissions</DataLabel>
          <PageTitle className="mx-auto mt-5 max-w-2xl text-balance text-4xl leading-[1.05] lg:text-5xl">
            Register as a Student
          </PageTitle>
          <p className="mx-auto mt-6 max-w-xl text-base text-(--color-text-secondary) lg:text-lg">
            Submit your details for department review. An Admin will contact you once your application has been
            decided.
          </p>
        </PageContainer>
      </section>

      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="mx-auto max-w-xl">
          <RegistrationForm />
        </div>
      </Section>
    </>
  );
}
