import type { HTMLAttributes } from "react";
import { PageContainer } from "./page-container";

/**
 * The public site's shared vertical rhythm — every page in the approved
 * wireframes (Hero, Stat Row, Feature Grid, CTA, ...) is a stack of these,
 * each with identical vertical padding and horizontal containment via
 * `PageContainer`, so no page invents its own spacing per section.
 */
export function Section({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`py-16 lg:py-24 ${className}`} {...props}>
      <PageContainer>{children}</PageContainer>
    </section>
  );
}
