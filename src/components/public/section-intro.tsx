import { SectionHeading } from "@/components/ui/typography";

export interface SectionIntroProps {
  title: string;
  description?: string;
}

/**
 * Version 2.0's section opener for the Home page — a heading plus an
 * optional one-line description, nothing else. Deliberately not a drop-in
 * change to `SectionHeader`: that component's "Sheet 0X/0Y" tag is still
 * live on five other public pages not yet through their own V2.0 pass, and
 * rewriting shared section-opener infrastructure ahead of reaching those
 * pages would silently redesign them too. Home simply stops consuming
 * `SectionHeader` and uses this instead; the "Sheet" numbering motif is a
 * deliberate per-page choice to retire, migrated page by page as each one
 * comes up for its own redesign, not a global rewrite done here.
 */
export function SectionIntro({ title, description }: SectionIntroProps) {
  return (
    <div className="mb-8 lg:mb-10">
      <SectionHeading className="text-2xl lg:text-[1.75rem]">{title}</SectionHeading>
      {description ? <p className="mt-2 max-w-2xl text-(--color-text-secondary)">{description}</p> : null}
    </div>
  );
}
