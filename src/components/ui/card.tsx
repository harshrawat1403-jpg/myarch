import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Set `false` for a card whose content fills it edge-to-edge (e.g. an image at the top of a gallery tile) — the caller supplies its own inner padding where needed instead of fighting the default `p-6`. Defaults to `true`. */
  padded?: boolean;
}

/**
 * The bordered-surface pattern every card-shaped block in the app uses.
 * Version 2.0: `rounded-lg` now resolves to 20px (the brief's explicit
 * figure, via `--radius-lg`), padding increased from `p-5` to `p-6` for
 * "generous padding," and a soft `shadow-sm` replaces V1.1's flat,
 * shadow-free border-only surface — the single biggest visual shift from
 * "technical drawing sheet" to "premium SaaS card."
 */

export function Card({ className = "", padded = true, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-(--color-border) bg-(--color-surface) shadow-sm ${padded ? "p-6" : ""} ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center justify-between gap-2 ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-2 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 ${className}`} {...props} />;
}
