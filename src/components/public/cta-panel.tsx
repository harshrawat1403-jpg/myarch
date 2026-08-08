import Link from "next/link";
import { buttonClassName, type ButtonVariant } from "@/components/ui/button";
import { SectionHeading, DataLabel } from "@/components/ui/typography";
import { PageContainer } from "./page-container";
import { BlueprintBackdrop } from "./blueprint-backdrop";
import { FrameCorners } from "./frame-corners";

export interface CtaPanelAction {
  label: string;
  href: string;
  /** Defaults to "primary" for the first action, "secondary" for every action after it. */
  variant?: ButtonVariant;
}

export interface CtaPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  actions: CtaPanelAction[];
  /** Version 2.0: set `false` to drop the blueprint texture and frame corners for a cleaner premium-SaaS panel. Defaults to `true` so the five public pages still using the original "stamped sheet" treatment (About and others not yet through their own V2.0 pass) are unaffected. */
  decorative?: boolean;
}

/**
 * The closing "stamped sheet" call-to-action band — a framed, corner-marked
 * panel floating on the page background rather than another full-width
 * strip. Introduced on the Home page's visual refinement pass and extracted
 * here once the About page needed the identical treatment with different
 * copy and links, confirming it's shared page-shell infrastructure rather
 * than Home-specific markup. Every remaining public page closes with this.
 */
export function CtaPanel({ eyebrow, title, description, actions, decorative = true }: CtaPanelProps) {
  return (
    <section className="border-t border-(--color-border) bg-(--color-background) py-20 lg:py-28">
      <PageContainer>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface) px-8 py-14 text-center shadow-sm lg:px-16">
          {decorative ? (
            <>
              <BlueprintBackdrop />
              <FrameCorners />
            </>
          ) : null}
          <div className="relative">
            <DataLabel className="text-(--color-accent)">{eyebrow}</DataLabel>
            <SectionHeading className="mt-3 text-2xl lg:text-3xl">{title}</SectionHeading>
            <p className="mx-auto mt-4 max-w-xl text-(--color-text-secondary)">{description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {actions.map((action, i) => {
                const variant = action.variant ?? (i === 0 ? "primary" : "secondary");
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={buttonClassName(variant, variant === "ghost" ? "" : "px-8 py-3")}
                  >
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
