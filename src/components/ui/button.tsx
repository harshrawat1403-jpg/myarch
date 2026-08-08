import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-(--color-accent) text-white shadow-sm hover:opacity-90 hover:shadow-md",
  secondary:
    "bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) hover:border-(--color-accent) hover:shadow-sm",
  ghost: "bg-transparent text-(--color-text-secondary) hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)",
  destructive: "bg-(--color-danger-soft) text-(--color-danger) hover:bg-(--color-danger)/20",
};

const BASE_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-[family-name:var(--font-body)] text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-background)";

/**
 * Exposes the exact classes `Button` renders with, for the rare legitimate
 * case something needs button *styling* on a non-`<button>` element — e.g.
 * `PublicNav`'s "Sign In", which must be a real `<Link>` for correct
 * navigation semantics (crawlable, works without JS, right-click "open in
 * new tab"), not a `<button onClick={...}>`. Avoids duplicating this class
 * string a second time (`13_Component_Library.md`'s ownership model implies
 * one definition, not a copy per use site).
 */
export function buttonClassName(variant: ButtonVariant = "secondary", className = ""): string {
  return `${BASE_BUTTON_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * The one Button primitive every page's actions use. Version 2.0: restyled
 * for the premium-SaaS palette (rounded-md now resolves to 14px via the
 * new `--radius-md` token, soft shadows instead of flat borders for
 * `primary`) and gained an explicit `focus-visible` ring — previously the
 * browser default outline, flagged in `docs/TECHNICAL_DEBT.md` as a
 * "design-system polish pass" item; closed here as a side effect of
 * restyling this file for V2.0, not a separate pass. `destructive` keeps
 * real, distinct styling (archive/reject actions still need to read as
 * consequential) but now uses the `--color-danger`/`--color-danger-soft`
 * tokens instead of hardcoded Tailwind red shades — the semantic-token
 * migration `docs/TECHNICAL_DEBT.md` also deferred, closed the same way.
 */
export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
