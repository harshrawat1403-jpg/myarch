import type { ReactNode } from "react";

/**
 * V4.0 E7 — a single summary metric ("How many X?"), reused across every
 * report page rather than each page hand-rolling its own number+label
 * markup. `definition` renders as visible helper text (not a hover-only
 * tooltip) so a metric's meaning is available without a pointer device —
 * screen-reader and keyboard users get it for free, and it directly serves
 * "clear definitions of metrics" / "do not rely on hiding information
 * behind hover."
 */
export interface MetricTileProps {
  readonly label: string;
  readonly value: string | number;
  readonly definition?: string;
}

export function MetricTile({ label, value, definition }: MetricTileProps) {
  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-background) p-4">
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">{value}</p>
      <p className="mt-1 text-sm font-medium text-(--color-text-secondary)">{label}</p>
      {definition && <p className="mt-1 text-xs text-(--color-text-secondary)/80">{definition}</p>}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
