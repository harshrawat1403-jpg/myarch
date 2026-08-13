"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";

export interface RequireRoleResult {
  isLoading: boolean;
  /** True once auth has resolved and the session's role is one of `allowedRoles`. */
  isAuthorized: boolean;
  /** True while a mustChangePassword session is being redirected away — callers should render a loading state, not their normal content, until this clears. */
  isBlockedByPasswordChange: boolean;
  handleLogout: () => Promise<void>;
}

/**
 * The shared UI-level route guard for every authenticated shell
 * ((admin)/(recruiter)/(student)) — replaces the three copy-pasted
 * isLoading/isAuthenticated/role-check blocks with one implementation
 * (docs/design/V1_UI_SPECIFICATION.md Part E's `RequireRole` entry,
 * implemented as a hook rather than a wrapper component since all three
 * call sites need the same values, not just gated rendering).
 *
 * Purely a UX convenience: it redirects to /login before rendering a page
 * that would just get 403s back from every fetch. The real authorization
 * is still enforced server-side on every API call via `withAuth`, exactly
 * as before — this hook never substitutes for that.
 *
 * `suppressRedirect` (passed by callers using `useDemoSession`, e.g.
 * SheetLayout's "Switch Demo" control): while a demo persona switch/exit is
 * in flight, `useDemoSession` applies the new session state (role/
 * isAuthenticated) before its own navigation lands on the new route — this
 * guard would otherwise see a transient mismatch on the OLD route and
 * redirect to /login, racing the intended navigation. Real sessions never
 * pass this flag, so it never suppresses a redirect for an actually
 * unauthorized visitor.
 */
export function useRequireRole(
  allowedRoles: readonly string[],
  options?: { suppressRedirect?: boolean },
): RequireRoleResult {
  const { isLoading, isAuthenticated, role, mustChangePassword, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthorized = isAuthenticated && role !== null && allowedRoles.includes(role);
  const isBlockedByPasswordChange = mustChangePassword && pathname !== "/change-password";
  const suppressRedirect = options?.suppressRedirect ?? false;

  useEffect(() => {
    if (isLoading || suppressRedirect) return;
    if (!isAuthorized) {
      router.replace("/login");
      return;
    }
    // V3.0 Administration Platform: a session with a temp password is
    // forced to /change-password before it can reach any real page — the
    // actual enforcement is server-side (with-auth.ts's
    // allowMustChangePassword gate rejects every other route with a 403
    // regardless of this redirect), this is only the UX shortcut so the
    // user never sees a page that would just 403 on its first fetch.
    if (isBlockedByPasswordChange) {
      router.replace("/change-password");
    }
  }, [isLoading, isAuthorized, isBlockedByPasswordChange, suppressRedirect, router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return { isLoading, isAuthorized, isBlockedByPasswordChange, handleLogout };
}
