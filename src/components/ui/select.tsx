import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-[--color-text-secondary]/30 bg-[--color-background] px-3 py-2 font-[family-name:var(--font-body)] text-sm text-[--color-text-primary] focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent] ${className}`}
      {...props}
    />
  );
}
