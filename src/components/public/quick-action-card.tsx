import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardTitle, DataLabel } from "@/components/ui/typography";

export interface QuickActionCardProps {
  /** Catalog-style index, e.g. "01" — decorative, hidden from assistive tech. */
  index: string;
  title: string;
  description: string;
  href: string;
  /** Version 2.0: optional Lucide icon shown above the title — omitted keeps the original index-only header. */
  icon?: LucideIcon;
  /** Applied to the outer link/grid-item — lets a parent grid give one action extra span (e.g. a lead action spanning multiple rows) without every entry point being forced to equal size. */
  className?: string;
  /** Version 2.0: for a lead action stretched taller than its content by a grid span — centers the content and scales the icon up, so the extra height reads as deliberate breathing room around a bigger mark rather than an accidental gap. */
  featured?: boolean;
}

/**
 * A whole-card link — the entire `Card` is the click/tap target, not just
 * an inline link inside it, for the Quick Actions grid's four large,
 * obvious entry points. Version 2.0: hover adds shadow elevation on top of
 * the existing border-color change, since this card is genuinely
 * clickable — the one card shape on the Home page that earns the "hover
 * elevation" treatment the brief asks for (purely informational cards on
 * the same page stay flat, so elevation keeps meaning "you can click this").
 */
export function QuickActionCard({ index, title, description, href, icon: Icon, className = "", featured = false }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={`group block rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-(--color-accent) ${className}`}
    >
      <Card
        className={`relative h-full overflow-hidden transition-[color,background-color,border-color,box-shadow] duration-150 group-hover:border-(--color-accent) group-hover:shadow-md ${featured ? "flex flex-col justify-center" : ""}`}
      >
        {featured && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-(--color-accent-soft) via-transparent to-transparent"
          />
        )}
        <div className="relative">
          <div className="flex items-start justify-between">
            {Icon ? (
              <span
                className={`flex items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent) ${featured ? "h-14 w-14" : "h-10 w-10"}`}
              >
                <Icon aria-hidden="true" size={featured ? 26 : 18} strokeWidth={1.75} />
              </span>
            ) : (
              <DataLabel aria-hidden="true" className="text-(--color-accent)">
                {index}
              </DataLabel>
            )}
            <span
              aria-hidden="true"
              className="text-sm text-(--color-accent) transition-transform duration-150 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </div>
          <CardTitle className={featured ? "mt-6 text-xl" : "mt-4"}>{title}</CardTitle>
          <p className={`mt-2 text-sm text-(--color-text-secondary) ${featured ? "max-w-xs" : ""}`}>{description}</p>
        </div>
      </Card>
    </Link>
  );
}
