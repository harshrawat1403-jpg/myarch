import { DataLabel, PageTitle } from "@/components/ui/typography";
import { PageContainer } from "@/components/public/page-container";
import { Section } from "@/components/public/section";
import { MaintenanceReportForm } from "@/components/public/maintenance-report-form";

/**
 * `/maintenance/report` — the public entry point for Maintenance reporting
 * (docs/architecture: MYARCH Phase 2 §3.1–§3.2), added so the public
 * navbar's "Maintenance" link has somewhere safe to go. Deliberately NOT the
 * authenticated `/maintenance` workspace (which requires a session and
 * assumes a staff/complainant shell) — this is a plain, publicly reachable
 * utility page, same convention as `/register`. All backend authorization
 * stays exactly as it already was: `MaintenanceReportForm` calls the
 * existing `POST /api/maintenance/issues`, which still requires a real
 * authenticated Secretary/Coordinator/Student session
 * (canReportMaintenanceIssue, unchanged) — an anonymous visitor reaching
 * this page sees an explanation and a sign-in prompt, never a weakened or
 * duplicated submission path.
 */
export default function PublicMaintenanceReportPage() {
  return (
    <>
      <section className="bg-(--color-surface)">
        <PageContainer className="py-16 text-center lg:py-20">
          <DataLabel className="text-center text-(--color-accent)">Facilities</DataLabel>
          <PageTitle className="mx-auto mt-5 max-w-2xl text-balance text-4xl leading-[1.05] lg:text-5xl">
            Report a Maintenance Issue
          </PageTitle>
          <p className="mx-auto mt-6 max-w-xl text-base text-(--color-text-secondary) lg:text-lg">
            Electrical, plumbing, furniture, network, lab equipment, safety, or any other facility problem on
            campus — report it here and the department will track it through to resolution.
          </p>
        </PageContainer>
      </section>

      <Section className="border-t border-(--color-border) bg-(--color-surface-muted)">
        <div className="mx-auto max-w-xl">
          <MaintenanceReportForm />
        </div>
      </Section>
    </>
  );
}
