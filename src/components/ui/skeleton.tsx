import { Card } from "./card";

export interface SkeletonProps {
  className?: string;
}

/** A single pulsing placeholder block — the raw primitive `CardGridSkeleton` composes into a page-shaped loading state. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-(--color-surface-muted) ${className}`} />;
}

export interface CardGridSkeletonProps {
  /** How many placeholder cards to render — match the page's own real grid density (e.g. PAGE_SIZE, capped) so the loading state doesn't visually jump when real data arrives. */
  count?: number;
}

/**
 * Edit Mode — replaces the plain "Loading X…" text every module list page
 * showed while its first fetch was in flight with a card-shaped pulsing
 * placeholder grid, matching the real card grid it's about to become. Pure
 * presentation: callers still gate this behind their own `isLoading` check
 * exactly as before, so no fetch/authorization logic changes.
 */
export function CardGridSkeleton({ count = 6 }: CardGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-1/2" />
        </Card>
      ))}
    </div>
  );
}
