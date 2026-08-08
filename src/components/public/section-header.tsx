import { DataLabel, SectionHeading } from "@/components/ui/typography";

export interface SectionHeaderProps {
  /** e.g. "02" — this section's position in the page's "drawing set." */
  index: string;
  /** Total numbered sections on the page, e.g. "06". */
  total: string;
  title: string;
}

/**
 * The recurring section-opener across the Home page: a small "Sheet 0X/0Y"
 * tag above the heading and a hairline rule below it — the same "this is
 * one sheet in a numbered set" idea `TitleBlock` already establishes at the
 * card level, applied once per section for page-level rhythm. The visible
 * heading text is unchanged from the plain `SectionHeading` this replaces,
 * so nothing about the page's accessible heading structure changes.
 */
export function SectionHeader({ index, total, title }: SectionHeaderProps) {
  return (
    <div className="mb-8 border-b border-(--color-text-secondary)/20 pb-4 lg:mb-10">
      <DataLabel className="text-(--color-accent)">{`Sheet ${index} / ${total}`}</DataLabel>
      <SectionHeading className="mt-2 text-xl lg:text-2xl">{title}</SectionHeading>
    </div>
  );
}
