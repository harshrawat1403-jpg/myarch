"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { roleHomePath } from "@/lib/role-home-path";

/**
 * MYARCH Edit Mode: the auth-redirect gate for `/`, split out of `page.tsx`
 * so `page.tsx` can stay a Server Component. `page.tsx` renders
 * `<HomeMarketingContent />` (an async Server Component that reads content
 * overrides — `@/lib/prisma`/`@/lib/file-storage` underneath) and passes
 * its already-resolved output in as `children` — this component never
 * imports `home-content.tsx` itself. That distinction matters: a `"use
 * client"` file importing a Server Component directly pulls that Server
 * Component's server-only dependencies (Prisma, `node:fs/promises`) into
 * the browser bundle and fails the build (confirmed the hard way —
 * Turbopack: "the chunking context does not support external modules,
 * request: node:fs/promises"). Passing it as `children` from a Server
 * Component parent avoids that entirely — the standard RSC composition
 * pattern for "a Client Component that conditionally shows server-rendered
 * content," mirroring `auth/client.ts`'s own client/server split rationale.
 */
export function HomeClientGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(roleHomePath(role));
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-(--color-text-secondary)">
        <p className="font-[family-name:var(--font-data)] text-sm">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
