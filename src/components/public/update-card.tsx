import { Card } from "@/components/ui/card";
import { CardTitle, DataLabel } from "@/components/ui/typography";

export interface UpdateCardProps {
  category: string;
  title: string;
  description: string;
  /** Version 2.0: which token the category strip's rule and text draw from — lets a grid of updates read as color-coded by kind instead of one repeated accent. Defaults to `"accent"`, the original single-color look. */
  tone?: "accent" | "secondary" | "highlight";
}

const TONE_CLASSES: Record<NonNullable<UpdateCardProps["tone"]>, string> = {
  accent: "border-(--color-accent) text-(--color-accent)",
  secondary: "border-(--color-secondary) text-(--color-secondary)",
  highlight: "border-(--color-highlight) text-(--color-highlight)",
};

/**
 * A horizontal "ticket stub" card — a category strip beside the content
 * rather than a stat/feature card's stacked layout — giving the Latest
 * Updates grid a distinct shape from every other card on the page while
 * still built on the shared `Card` primitive (Design Consistency
 * Checklist: every bordered-surface block is `Card`, never hand-rolled).
 */
export function UpdateCard({ category, title, description, tone = "accent" }: UpdateCardProps) {
  return (
    <Card>
      <div className="flex gap-4">
        <div className={`w-16 shrink-0 border-l-2 pl-4 ${TONE_CLASSES[tone]}`}>
          <DataLabel className="text-inherit">{category}</DataLabel>
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-2 text-sm text-(--color-text-secondary)">{description}</p>
        </div>
      </div>
    </Card>
  );
}
