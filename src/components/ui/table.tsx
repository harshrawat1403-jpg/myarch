import type { ReactNode } from "react";
import { Checkbox } from "./checkbox";

/**
 * Semantic table markup throughout — column meaning must be announced
 * correctly by assistive technology, not conveyed by visual position
 * alone (docs/design/23_Accessibility_Guidelines.md). Version 2.0: header
 * cells dropped the mono/uppercase/tracked treatment (the same "technical
 * data label" motif retired from `DataLabel` on the public site) for a
 * plain, calmer sans label, and every border moved from the V1.1 dimmed-
 * text technique to the explicit `--color-border` token.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-(--color-border)">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-(--color-border) bg-(--color-surface-muted)">{children}</thead>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-(--color-border) transition-colors duration-150 last:border-0 hover:bg-(--color-surface-muted)">{children}</tr>;
}

export function TableHeaderCell({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 font-[family-name:var(--font-body)] text-xs font-semibold text-(--color-text-secondary)">
      {children}
    </th>
  );
}

export function TableCell({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td className="px-4 py-3 text-(--color-text-primary)" colSpan={colSpan}>
      {children}
    </td>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export interface TableCheckboxHeaderCellProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}

/** V3.0: the "select all" checkbox in a bulk-select table's header row — additive to the Table family, not a parallel component (mirrors the existing `mobileCard`-style extension precedent). */
export function TableCheckboxHeaderCell({ checked, indeterminate, onChange }: TableCheckboxHeaderCellProps) {
  return (
    <th scope="col" className="w-10 px-4 py-3">
      <Checkbox
        label="Select all rows"
        hideLabel
        checked={checked}
        indeterminate={indeterminate}
        onChange={(e) => onChange(e.target.checked)}
      />
    </th>
  );
}

export interface TableCheckboxCellProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** V3.0: a single row's selection checkbox. `label` is the accessible name only (e.g. "Select Alice Architect") — never rendered visibly, since the row's own cells already show that text. */
export function TableCheckboxCell({ checked, onChange, label }: TableCheckboxCellProps) {
  return (
    <td className="w-10 px-4 py-3">
      <Checkbox label={label} hideLabel checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </td>
  );
}
