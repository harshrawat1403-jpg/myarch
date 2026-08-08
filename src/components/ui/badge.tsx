export type BadgeVariant = "neutral" | "pending" | "approved" | "rejected" | "active" | "archived";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-(--color-surface-muted) text-(--color-text-secondary)",
  pending: "bg-(--color-warning-soft) text-(--color-warning)",
  approved: "bg-(--color-success-soft) text-(--color-success)",
  rejected: "bg-(--color-danger-soft) text-(--color-danger)",
  active: "bg-(--color-accent-soft) text-(--color-accent)",
  archived: "bg-(--color-surface-muted) text-(--color-text-secondary)",
};

/**
 * Status is always conveyed by a label, never color alone — required for
 * legibility under color-vision deficiency and low-fidelity displays
 * (docs/design/23_Accessibility_Guidelines.md). Version 2.0: every variant
 * now reads from the semantic `--color-success`/`--color-warning`/
 * `--color-danger` tokens (plus the new `--color-accent-soft`/
 * `--color-surface-muted` pair) instead of hardcoded Tailwind shades —
 * the token migration `docs/TECHNICAL_DEBT.md` deferred since Milestone 0,
 * closed here while this file was already being restyled for the new
 * palette.
 */
export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-[family-name:var(--font-body)] text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
