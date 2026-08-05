import type { ReactNode } from "react";

/** Semantic table markup throughout — column meaning must be announced correctly by assistive technology, not conveyed by visual position alone (docs/design/23_Accessibility_Guidelines.md). */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-[--color-text-secondary]/20">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-[--color-text-secondary]/20 bg-[--color-surface]">{children}</thead>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-[--color-text-secondary]/10 last:border-0">{children}</tr>;
}

export function TableHeaderCell({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2 font-[family-name:var(--font-data)] text-xs font-medium uppercase tracking-wide text-[--color-text-secondary]"
    >
      {children}
    </th>
  );
}

export function TableCell({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td className="px-4 py-3 text-[--color-text-primary]" colSpan={colSpan}>
      {children}
    </td>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}
