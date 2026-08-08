import type { HTMLAttributes } from "react";

/**
 * Centralizes the repeated font-family utility classes (one per typography
 * token — display, body, data) that were previously copy-pasted inline on
 * every heading/label across every page (docs/design/V1_UI_SPECIFICATION.md
 * Part A.5 — ~40 occurrences, no build-time signal if one drifted). One
 * definition per role, matching the three text roles already in consistent
 * use: page-level titles,
 * card/section headings, and small uppercase metadata labels (the Title
 * Block's own field-label style). No other typography role exists in the
 * shipped UI, so no others are added speculatively.
 */

export function PageTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={`font-[family-name:var(--font-display)] text-2xl text-(--color-text-primary) ${className}`}
      {...props}
    />
  );
}

export function SectionHeading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`font-[family-name:var(--font-display)] text-lg text-(--color-text-primary) ${className}`}
      {...props}
    />
  );
}

/**
 * Version 2.0: dropped the monospace/uppercase "technical data label"
 * treatment in favor of a small, plain sans-serif eyebrow label — the
 * mono-uppercase motif was part of V1.1's "drafting sheet" identity and
 * read as technical/admin rather than premium SaaS. Same role (a small
 * label above a heading, or a metadata field name), different voice.
 */
export function DataLabel({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`font-[family-name:var(--font-body)] text-xs font-medium text-(--color-text-secondary) ${className}`}
      {...props}
    />
  );
}

/**
 * A fourth typographic role, added for Milestone 2 (Home page): card/tile
 * titles that sit one level below `SectionHeading` (e.g. a feature card's
 * own title inside a `SectionHeading`-labeled grid) — `h3`, matching the
 * same display-font family as the other two heading roles.
 */
export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-[family-name:var(--font-display)] text-base font-medium text-(--color-text-primary) ${className}`}
      {...props}
    />
  );
}
