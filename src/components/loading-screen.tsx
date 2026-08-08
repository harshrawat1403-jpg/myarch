import { Logo } from "@/components/logo";

/**
 * The shared full-screen loading state — every route-protection gate
 * (`(admin)`, `(recruiter)`, `(student)` layouts) and Next's own route-
 * transition `loading.tsx` show this while a session check or navigation
 * resolves. Deliberately restrained per the brief: the logo, a slow
 * `motion-safe:` opacity pulse (skipped entirely for
 * `prefers-reduced-motion` users), and nothing else — no spinner, no
 * bounce. "Loading…" is present for assistive tech via `sr-only` rather
 * than visible text, keeping the screen visually just the mark.
 */
export function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-background)">
      <div className="motion-safe:animate-pulse">
        <Logo size="lg" />
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
