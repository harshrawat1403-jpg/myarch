import { HomeClientGate } from "./home-client-gate";
import HomeMarketingContent from "./home-content";

// MYARCH Edit Mode: HomeMarketingContent reads live content overrides on
// every request — without this, Next would statically prerender this
// route once at build time, and a Publish would never actually reach
// visitors until the next deploy.
export const dynamic = "force-dynamic";

/**
 * `/` — the public marketing Home page. An authenticated session is still
 * bounced straight to its own portal (see `roleHomePath`); only an
 * unauthenticated visitor sees the content below.
 *
 * MYARCH Edit Mode: this file is a Server Component (not `"use client"`)
 * specifically so it can render the async `HomeMarketingContent` directly
 * and pass its resolved output into `HomeClientGate` as `children` — see
 * that file's own doc comment for why this direction (Server Component
 * parent → Client Component wrapper) is required, not the reverse.
 */
export default async function Home() {
  return (
    <HomeClientGate>
      <HomeMarketingContent />
    </HomeClientGate>
  );
}
