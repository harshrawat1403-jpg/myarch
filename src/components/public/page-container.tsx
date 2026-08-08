import type { HTMLAttributes } from "react";

/**
 * The public site's one shared horizontal container
 * (docs/design/V1_UI_SPECIFICATION.md Part C addendum: "max-width: 1280px
 * ... px-4 on mobile growing to px-8 at lg and above") — every public page
 * and `PublicNav`/`Footer` use this instead of inventing a container width
 * per section.
 */
export function PageContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto max-w-[1280px] px-4 lg:px-8 ${className}`} {...props} />;
}
