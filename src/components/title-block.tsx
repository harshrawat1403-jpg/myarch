import type { ReactNode } from "react";

export interface TitleBlockProps {
  /** e.g. the card's subject, a student's name, a drive/company name, a metric name. */
  project: string;
  /** e.g. scope/count — "12 of 48 students", a batch label, an eligible batch. */
  scale: string;
  /** As-of / last-updated date. Accepts a Date or a pre-formatted string. */
  date: Date | string;
  /** Acting role or person responsible — "Coordinator: R. Sharma", "System". */
  drawnBy: string;
  status?: ReactNode;
}

function formatDate(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString().slice(0, 10);
}

/**
 * TNPArch's signature reused element (docs/design/12_Design_System.md,
 * docs/design/13_Component_Library.md): a technical-drawing-style metadata
 * panel appearing identically across dashboard cards, profile headers,
 * batch cards, and statistics panels — same frame, different content per
 * context. Field labels are fixed; only the values change.
 *
 * Version 2.0 Foundation: only the border token and colors were re-themed
 * for the light palette here. Left deliberately undecided: whether this
 * 4-field metadata-stamp concept itself (still monospace, still fairly
 * dense) fits the brief's "reduce visible text," "icon-first," "premium
 * SaaS" goals, or should be simplified/retired on the specific pages that
 * use it (Dashboard batch cards, Recruiter directory, Student Portal).
 * That's a page-content decision for when each of those pages is reached,
 * not a primitive-level one — flagged here rather than decided unilaterally
 * in the Foundation pass.
 */
export function TitleBlock({ project, scale, date, drawnBy, status }: TitleBlockProps) {
  return (
    <div className="border-t border-(--color-border) pt-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-[family-name:var(--font-data)] text-xs">
          <dt className="text-(--color-text-secondary)">PROJECT</dt>
          <dd className="text-(--color-text-primary)">{project}</dd>
          <dt className="text-(--color-text-secondary)">SCALE</dt>
          <dd className="text-(--color-text-primary)">{scale}</dd>
          <dt className="text-(--color-text-secondary)">DATE</dt>
          <dd className="text-(--color-text-primary)">{formatDate(date)}</dd>
          <dt className="text-(--color-text-secondary)">DRAWN BY</dt>
          <dd className="text-(--color-text-primary)">{drawnBy}</dd>
        </dl>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
    </div>
  );
}
