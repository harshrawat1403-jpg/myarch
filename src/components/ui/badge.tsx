export type BadgeVariant = "neutral" | "pending" | "approved" | "rejected" | "active" | "archived";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-[--color-text-secondary]/15 text-[--color-text-secondary]",
  pending: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  active: "bg-[--color-accent]/15 text-[--color-accent]",
  archived: "bg-[--color-text-secondary]/15 text-[--color-text-secondary]",
};

/**
 * Status is always conveyed by a label, never color alone — required for
 * legibility under color-vision deficiency and low-fidelity displays
 * (docs/design/23_Accessibility_Guidelines.md).
 */
export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-[family-name:var(--font-data)] text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
