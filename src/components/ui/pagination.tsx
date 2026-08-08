import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  /** 1-indexed. */
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

/**
 * Client-side pagination over an already-fetched array — every existing
 * list page (Students, Batches, Audit) fetches and renders its full result
 * set with no page control, and this deliberately keeps that pattern rather
 * than pairing with a new server-side offset/limit contract, consistent
 * with department scale. A future improvement, not this phase's job.
 */
export function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-(--color-text-secondary)">
        {rangeStart}–{rangeEnd} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
        <span className="px-2 text-xs text-(--color-text-secondary)">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        >
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}
