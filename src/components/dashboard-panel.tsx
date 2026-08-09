import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/typography";

export interface DashboardPanelAction {
  label: string;
  href: string;
}

export interface DashboardPanelProps {
  title: string;
  /** Optional "View All" / "Manage" link — omitted for panels with no dedicated destination page yet (e.g. a placeholder panel). */
  action?: DashboardPanelAction;
  /** Version 2.0: an optional small icon beside the title, matching the public site's icon-first language — omitted keeps the plain text-only header. */
  icon?: LucideIcon;
  children: ReactNode;
}

/**
 * The dashboard's operational panel — a titled `Card` with an optional
 * link to the full page a preview summarizes. Extracted because this
 * milestone's overview page uses it five times (Pending Approvals, Recent
 * Activity, Batch Overview, Pending Registrations, Placement Pipeline) —
 * the same same-page-reuse threshold `ProcessSteps`/`SectionHeader` were
 * extracted at on the public site — and every future authenticated page
 * this project redesigns (Batches, Approvals, Audit, Exports) is likely to
 * need the identical "titled panel with a link to more" shape.
 */
export function DashboardPanel({ title, action, icon: Icon, children }: DashboardPanelProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon aria-hidden="true" size={17} strokeWidth={1.75} className="text-(--color-text-secondary)" />}
          <CardTitle>{title}</CardTitle>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-xs font-medium text-(--color-accent) transition-colors duration-150 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
