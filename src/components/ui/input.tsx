import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-[--color-text-secondary]/30 bg-[--color-background] px-3 py-2 font-[family-name:var(--font-body)] text-sm text-[--color-text-primary] placeholder:text-[--color-text-secondary] focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent] ${className}`}
      {...props}
    />
  );
}

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1 block font-[family-name:var(--font-data)] text-xs uppercase tracking-wide text-[--color-text-secondary] ${className}`}
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
    <p role="alert" className="mt-1 text-xs text-red-400">
      {children}
    </p>
  );
}
