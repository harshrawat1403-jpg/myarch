import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClassName } from "@/components/ui/button";

/**
 * Next.js's catch-all 404 convention file — shown for any unmatched
 * route. Purely presentational; adds no route of its own.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-(--color-background) px-4 text-center">
      <Logo size="lg" />
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-text-primary)">Page not found</h1>
      <p className="mt-3 max-w-sm text-(--color-text-secondary)">The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.</p>
      <Link href="/" className={buttonClassName("primary", "mt-8 px-8 py-3")}>
        Return Home
      </Link>
    </main>
  );
}
