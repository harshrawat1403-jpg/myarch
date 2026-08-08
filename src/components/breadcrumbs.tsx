import Link from "next/link";

export interface BreadcrumbItem {
  readonly label: string;
  /** Omit on the last item — the current page is text, not a link to itself. */
  readonly href?: string;
}

/**
 * Reusable breadcrumb trail — built during the public-site milestones as
 * infrastructure with no consumer yet (the public IA is flat, one level
 * deep, so nothing there needed it). Relocated out of `components/public/`
 * in Milestone 8, its first real consumer: `SheetLayout`'s new header,
 * where every authenticated section is exactly the kind of one-level-deep
 * hierarchy this component was designed for. Nothing about the component
 * itself changed — only its location, since it was never actually
 * public-site-specific.
 */
export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-(--color-text-secondary)">
                  /
                </span>
              )}
              {item.href && !isLast ? (
                <Link href={item.href} className="text-(--color-text-secondary) hover:text-(--color-text-primary)">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-(--color-text-primary)">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
