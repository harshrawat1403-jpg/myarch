import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { Footer } from "@/components/public/footer";
import { EditModeProvider } from "@/components/edit-mode/edit-mode-context";
import { EditModeToolbar } from "@/components/edit-mode/edit-mode-toolbar";

/**
 * The public marketing site's shared shell — Milestone 1 of V1.1
 * (docs/design/V1_UI_SPECIFICATION.md Part J). Home (Milestone 2) is the
 * first page mounted under it; About/Placements/Students/Recruiters/
 * Contact (Milestones 3–7) each add one more page.tsx here as they're
 * built.
 *
 * Deliberately separate from the existing `(public)` route group, which
 * holds only `/login` — the approved spec keeps Login a bare, centered
 * card, intentionally never wrapped in this nav/footer shell.
 *
 * Mostly server-rendered: only `PublicNav` needs client-side interactivity
 * (the mobile menu, active-link detection); this layout and `Footer` have
 * none, unlike the authenticated `SheetLayout`, which is client-rendered
 * throughout because every one of its screens needs `useAuth()`.
 *
 * No animated page-transition was added between routes — the approved
 * Motion guidelines (`12_Design_System.md`, reaffirmed in
 * V1_UI_SPECIFICATION.md Part B) are explicit that "page-level transitions
 * are avoided entirely." "Transition structure" is interpreted here as
 * structural consistency (every page renders inside the same landmark, so
 * navigation is instant with no layout shift), not a new animation — see
 * this milestone's report for the full reasoning; flag if animated
 * transitions were actually intended, since that would be a deviation from
 * the approved spec this file does not make silently.
 *
 * MYARCH Edit Mode — `EditModeProvider` wraps the whole shell (not just
 * `children`) so `EditModeToolbar` and every page's content share one
 * `isActive`/Preview/pending-count state. Reached the same way a Secretary
 * already reaches the public site today (`SheetLayout`'s "visit public
 * website" link) — no new dashboard route, no page-builder, no CMS. See
 * `src/components/edit-mode/edit-mode-context.tsx`.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <EditModeProvider>
      <div className="flex min-h-screen flex-col bg-(--color-background) text-(--color-text-primary)">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-(--color-accent) focus:px-4 focus:py-2 focus:text-(--color-background)"
        >
          Skip to main content
        </a>
        <PublicNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <EditModeToolbar />
      </div>
    </EditModeProvider>
  );
}
