import type { LucideIcon } from "lucide-react";
import { Card } from "./card";
import { TitleBlock } from "@/components/title-block";

export interface StatPanelProps {
  label: string;
  value: string | number;
  scope: string;
  /** As-of caption for the TitleBlock's DATE field. Defaults to a static label rather than `new Date()` — this is illustrative data, not a live figure, so a real per-render timestamp would overstate its freshness. */
  asOf?: string;
  /** Version 2.0: renders `label`/`scope` as plain text instead of the four-field `TitleBlock` stamp — opt-in so the five other existing consumers (Dashboard, Student Management, Approval Workspace, Recruiter Portal) keep their current look until each is redesigned in its own turn. */
  compact?: boolean;
  /** Compact mode only: an optional small icon above the number, matching the public site's stat-band language. Omitted in the default (non-compact) rendering, which is already visually full via `TitleBlock`. */
  icon?: LucideIcon;
}

/**
 * The canonical "big number + TitleBlock metadata" panel
 * (docs/design/V1_UI_SPECIFICATION.md Part E) — replaces the two near-
 * identical ad hoc implementations (`StatCard` in the dashboard,
 * `StatTile` in the recruiter portal) with one shared component. Those two
 * call sites are left untouched for now per the incremental adoption
 * strategy; they migrate to this component when their own pages are next
 * redesigned, not as part of this milestone.
 *
 * The accent top edge and larger numeral (added in the Home page's visual
 * refinement pass) distinguish it from a plain `Card` at a glance — a
 * stat is the one card shape on the page meant to be scanned, not read.
 */
export function StatPanel({
  label,
  value,
  scope,
  asOf = "Updated periodically",
  compact = false,
  icon: Icon,
}: StatPanelProps) {
  if (compact) {
    return (
      <Card className="border-t-2 border-t-(--color-accent)">
        {Icon && (
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
            <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
          </span>
        )}
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-(--color-text-primary) lg:text-4xl">
          {value}
        </p>
        <p className="mt-2 text-sm font-medium text-(--color-text-primary)">{label}</p>
        <p className="mt-0.5 text-xs text-(--color-text-secondary)">{scope}</p>
      </Card>
    );
  }

  return (
    <Card className="border-t-2 border-t-(--color-accent)">
      <p className="font-[family-name:var(--font-data)] text-4xl text-(--color-text-primary) lg:text-5xl">
        {value}
      </p>
      <TitleBlock project={label} scale={scope} date={asOf} drawnBy="MYARCH" />
    </Card>
  );
}
