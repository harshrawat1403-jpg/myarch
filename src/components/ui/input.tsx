import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-(--color-border) bg-(--color-background) px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-(--color-text-primary) placeholder:text-(--color-text-secondary) transition-colors duration-150 focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20 ${className}`}
      {...props}
    />
  );
}

/**
 * Version 2.0: dropped the monospace/uppercase "technical data label"
 * treatment (`--font-data`, `uppercase tracking-wide`) in favor of a plain
 * sans-serif form label — the mono-uppercase motif was part of what read
 * as "old admin-panel," not "premium SaaS." Same role, same primitive,
 * different typographic voice.
 */
export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block font-[family-name:var(--font-body)] text-sm font-medium text-(--color-text-secondary) ${className}`}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  // role="alert" so assistive technology announces a validation error the
  // moment it appears, rather than requiring the user to discover it
  // visually (docs/design/23_Accessibility_Guidelines.md).
  return (
    <p role="alert" className="mt-1 text-xs text-(--color-danger)">
      {children}
    </p>
  );
}
