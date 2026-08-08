import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-(--color-border) bg-(--color-background) px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-(--color-text-primary) transition-colors duration-150 focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20 ${className}`}
      {...props}
    />
  );
}
