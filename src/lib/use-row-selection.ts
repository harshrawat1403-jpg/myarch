"use client";

import { useMemo, useState } from "react";

export interface RowSelection<T> {
  isSelected(item: T): boolean;
  toggle(item: T): void;
  toggleAll(): void;
  clear(): void;
  readonly selectedIds: ReadonlySet<string>;
  readonly selectedCount: number;
  readonly isAllSelected: boolean;
  readonly isIndeterminate: boolean;
}

/**
 * Generic bulk-select state for any list — tracks selection by a caller-
 * supplied id rather than object identity, so re-fetched rows (a new array
 * reference with the same ids) don't silently lose their selection.
 * Deliberately built once, here, rather than duplicated per page: the
 * bulk-select pattern is new to this codebase in V3.0 and Coordinator/
 * Recruiter/Student management all need the identical selection mechanics.
 */
export function useRowSelection<T>(items: readonly T[], getId: (item: T) => string): RowSelection<T> {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const visibleIds = useMemo(() => items.map(getId), [items, getId]);

  function isSelected(item: T): boolean {
    return selectedIds.has(getId(item));
  }

  function toggle(item: T): void {
    const id = getId(item);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelectedIds((current) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id));
      return allSelected ? new Set() : new Set(visibleIds);
    });
  }

  function clear(): void {
    setSelectedIds(new Set());
  }

  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const isAllSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const isIndeterminate = selectedVisibleCount > 0 && !isAllSelected;

  return {
    isSelected,
    toggle,
    toggleAll,
    clear,
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isIndeterminate,
  };
}
