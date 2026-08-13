"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api-client";
import { roleHomePath } from "@/lib/role-home-path";
import type { DemoPersona } from "@/lib/demo-persona";

export interface UseDemoSessionResult {
  isDemo: boolean;
  /** The persona currently being switched into, `"EXIT"` while exiting, or `null` when idle — lets the UI show a busy state and ignore extra clicks mid-transition. */
  pending: DemoPersona | "EXIT" | null;
  switchDemo: (persona: DemoPersona) => void;
  exitDemo: () => void;
}

/**
 * Lets a visitor already inside a demo session jump directly to another
 * persona (or exit) from wherever they are in the dashboard — never routed
 * back through the public landing page first. Shared by every authenticated
 * shell ((admin)/(student)/(recruiter) layouts, via SheetLayout's demo
 * banner) so this logic exists exactly once, not once per layout.
 *
 * Reuses the exact same `loginAsDemo()`/`logout()` calls the landing page's
 * own "Visit as ..." buttons and "Exit Demo" already use — no new
 * authentication path, no new endpoint.
 */
export function useDemoSession(): UseDemoSessionResult {
  const { isDemo, loginAsDemo, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<DemoPersona | "EXIT" | null>(null);

  const switchDemo = useCallback(
    (persona: DemoPersona) => {
      if (pending) return;
      setPending(persona);
      loginAsDemo(persona)
        .then(({ role }) => {
          router.push(roleHomePath(role));
          // Left `pending` set on success — this layout instance is about to
          // unmount as the route changes to the new persona's home page
          // (which mounts its own useDemoSession with pending=null). Clearing
          // it here first would flip `isAuthorized` back on before that
          // navigation lands, reopening the exact race `suppressRedirect`
          // (useRequireRole) exists to prevent.
        })
        .catch((err) => {
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't switch demo accounts. Please try again.",
          );
          setPending(null);
        });
    },
    [pending, loginAsDemo, router, toast],
  );

  const exitDemo = useCallback(() => {
    if (pending) return;
    setPending("EXIT");
    // logout() never rejects (see AuthProvider's own comment), so there's no
    // error path here — pending is intentionally left set, for the same
    // reason as switchDemo above: this layout unmounts once router.replace
    // lands on the public landing page.
    logout().then(() => router.replace("/"));
  }, [pending, logout, router]);

  return { isDemo, pending, switchDemo, exitDemo };
}
