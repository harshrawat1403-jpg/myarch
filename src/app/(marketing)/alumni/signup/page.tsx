import { DataLabel, PageTitle } from "@/components/ui/typography";
import { PageContainer } from "@/components/public/page-container";
import { Section } from "@/components/public/section";
import { AlumniSignupForm } from "@/components/public/alumni-signup-form";

/**
 * MYARCH Phase 1 (§2.4) — public, unauthenticated Alumni self-signup entry
 * point. Mirrors the Recruiter signup page's shape exactly.
 */
export default function AlumniSignupPage() {
  return (
    <>
      <section className="bg-(--color-surface)">
        <PageContainer className="py-16 text-center lg:py-20">
          <DataLabel className="text-center text-(--color-accent)">Alumni</DataLabel>
          <PageTitle className="mx-auto mt-5 max-w-2xl text-balance text-4xl leading-[1.05] lg:text-5xl">
            Create an Alumni Account
          </PageTitle>
          <p className="mx-auto mt-6 max-w-xl text-base text-(--color-text-secondary) lg:text-lg">
            Sign up to stay connected with the department. A Technical Secretary reviews every new account before
            it can sign in.
          </p>
        </PageContainer>
      </section>

      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="mx-auto max-w-xl">
          <AlumniSignupForm />
        </div>
      </Section>
    </>
  );
}
