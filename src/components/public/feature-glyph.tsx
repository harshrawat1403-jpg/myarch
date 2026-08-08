import type { ReactNode } from "react";

export type FeatureGlyphVariant = "design" | "software" | "studio" | "thinking" | "process" | "dialogue";

const GLYPH_PATHS: Record<FeatureGlyphVariant, ReactNode> = {
  design: (
    <>
      <circle cx="14" cy="14" r="9" />
      <line x1="14" y1="3" x2="14" y2="7" />
      <line x1="14" y1="21" x2="14" y2="25" />
      <line x1="3" y1="14" x2="7" y2="14" />
      <line x1="21" y1="14" x2="25" y2="14" />
    </>
  ),
  software: (
    <>
      <rect x="4" y="4" width="9" height="9" />
      <rect x="15" y="4" width="9" height="9" />
      <rect x="4" y="15" width="9" height="9" />
      <rect x="15" y="15" width="9" height="9" />
    </>
  ),
  studio: (
    <>
      <rect x="5" y="5" width="15" height="15" />
      <rect x="9" y="9" width="15" height="15" />
    </>
  ),
  thinking: (
    <>
      <path d="M14 4 L24 23 L4 23 Z" />
      <circle cx="14" cy="15" r="2.5" />
    </>
  ),
  process: (
    <>
      <path d="M22 10 A9 9 0 1 0 23 16" />
      <path d="M17 6 L22 10 L17 13" />
    </>
  ),
  dialogue: (
    <>
      <circle cx="11" cy="13" r="8" />
      <circle cx="18" cy="16" r="6" />
    </>
  ),
};

/**
 * A small, hand-drawn line-icon set shared across public pages — no icon
 * library dependency (13_Component_Library.md's ownership model). Started
 * as four marks for Home's "Why Recruit" grid (a drafting compass, a tool
 * grid, overlapping planes, a plan-and-section triangle); the About page's
 * Studio Culture grid added two more (a looping iteration arrow, two
 * overlapping circles for critique/dialogue) rather than reusing one of the
 * four out of context.
 */
export function FeatureGlyph({ variant }: { variant: FeatureGlyphVariant }) {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      {GLYPH_PATHS[variant]}
    </svg>
  );
}
