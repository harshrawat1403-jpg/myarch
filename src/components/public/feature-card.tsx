import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/typography";
import { FeatureGlyph, type FeatureGlyphVariant } from "./feature-glyph";

export interface FeatureCardProps {
  title: string;
  description: string;
  /** Optional hand-drawn line glyph — omit for a plain title+description card (e.g. the Department Introduction's Vision panel). Mutually exclusive with `icon`; `icon` takes precedence if both are given. */
  glyph?: FeatureGlyphVariant;
  /** Version 2.0: optional Lucide icon in a soft circular badge, replacing the hand-drawn glyph mark on pages moving to the icon-first system. */
  icon?: LucideIcon;
}

/** A short title+description blurb in a `Card`, with an optional icon mark — reused for both the Department Introduction's Vision panel style content and the "Why Recruit" feature grid, avoiding a second hand-rolled card shape for what is structurally the same block. */
export function FeatureCard({ title, description, glyph, icon: Icon }: FeatureCardProps) {
  return (
    <Card>
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
          <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
        </span>
      ) : glyph ? (
        <div className="text-(--color-accent)">
          <FeatureGlyph variant={glyph} />
        </div>
      ) : null}
      <CardTitle className={Icon || glyph ? "mt-4" : undefined}>{title}</CardTitle>
      <p className="mt-2 text-sm text-(--color-text-secondary)">{description}</p>
    </Card>
  );
}
