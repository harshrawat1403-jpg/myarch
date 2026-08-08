/**
 * A decorative, `aria-hidden` grid pattern giving otherwise-empty surfaces
 * (the hero band, showcase-card placeholders) an architecture-drafting
 * texture instead of a flat fill — the "blueprint-inspired graphics" the
 * Milestone 2 brief asked for, built as pure CSS (no image asset, no object
 * storage dependency, consistent with `TECHNICAL_DEBT.md`'s note that no
 * file-upload/image pipeline exists yet). Must be placed inside a
 * `relative overflow-hidden` parent.
 */
export function BlueprintBackdrop({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(var(--color-accent)_1px,transparent_1px),linear-gradient(90deg,var(--color-accent)_1px,transparent_1px)] [background-size:2rem_2rem] ${className}`}
    />
  );
}
