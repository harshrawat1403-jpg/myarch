import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

/**
 * A small, friendly empty state — an icon in a soft circle above a short
 * message, instead of a bare sentence of muted text. Extracted for the
 * dashboard overview (used three times on one page: Pending Approvals,
 * Recent Activity, Batch Overview) — the same reuse threshold
 * `DashboardPanel` itself was extracted at. Every future authenticated
 * page redesign is likely to need the same "nothing here yet" treatment.
 */
export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-surface-muted) text-(--color-text-secondary)">
        <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
      </span>
      <p className="text-sm text-(--color-text-secondary)">{message}</p>
    </div>
  );
}
