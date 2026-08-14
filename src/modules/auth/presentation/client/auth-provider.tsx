"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import type { Role } from "../../domain/entities";

/**
 * Client-side session state for the dashboard. The access token lives ONLY
 * in this React state (memory) — never localStorage, never a cookie — per
 * the Days 2–3 security decision to keep it out of any channel a stolen
 * cookie or an XSS payload reading storage could exploit. On mount, this
 * silently calls the existing POST /api/auth/refresh (which relies entirely
 * on the httpOnly refresh-token cookie already scoped to /api/auth — no
 * auth-system change was needed to make this work) so a page reload doesn't
 * force a fresh login as long as the underlying session is still valid.
 */
export interface AuthContextValue {
  accessToken: string | null;
  role: Role | null;
  userId: string | null;
  /** Only present for STUDENT actors — the StudentProfile row this session's own draft/published profile endpoints are scoped to. */
  studentProfileId: string | null;
  /** Only present for COORDINATOR actors — the batch IDs this session's server-side authorization checks are scoped to. Display-only here (e.g. the shell's scope sub-label); every real scope check still happens server-side. */
  batchScope: readonly string[] | null;
  /** True when this session must change its password before doing anything else — see with-auth.ts's `allowMustChangePassword` gate, which is the real enforcement; this is what drives the frontend's forced-redirect. */
  mustChangePassword: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Returns the just-decoded role directly (rather than relying on the
   * caller to read the hook's `role` state after a re-render, which isn't
   * available synchronously) — the login page uses this to redirect by
   * role immediately after a successful login.
   */
  login: (email: string, password: string) => Promise<{ role: Role | null }>;
  logout: () => Promise<void>;
  /**
   * Applies a freshly-issued access token without a full login round trip —
   * used after a successful password change, whose response already
   * includes a new token (mustChangePassword now cleared) rather than
   * making the caller re-authenticate with the just-set password.
   */
  applySessionToken: (accessToken: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface DecodedClaims {
  sub?: string;
  role?: string;
  studentProfileId?: string;
  batchScope?: readonly string[];
  mustChangePassword?: boolean;
}

function decodeAccessTokenClaims(token: string): DecodedClaims {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return {};
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as DecodedClaims;
  } catch {
    // Display-only decoding — a malformed token here just means the UI
    // shows nothing extra; every real authorization check still happens
    // server-side against the token's verified signature.
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [batchScope, setBatchScope] = useState<readonly string[] | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((token: string): Role | null => {
    const claims = decodeAccessTokenClaims(token);
    const decodedRole = (claims.role as Role) ?? null;
    setAccessToken(token);
    setRole(decodedRole);
    setUserId(claims.sub ?? null);
    setStudentProfileId(claims.studentProfileId ?? null);
    setBatchScope(claims.batchScope ?? null);
    setMustChangePassword(claims.mustChangePassword ?? false);
    return decodedRole;
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRole(null);
    setUserId(null);
    setStudentProfileId(null);
    setBatchScope(null);
    setMustChangePassword(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // React Strict Mode double-invokes effects in development, mounting →
    // cleaning up → mounting again. Without aborting the first request, both
    // would reach POST /api/auth/refresh for real: the first rotates the
    // single-use httpOnly refresh-token cookie, and the second — still
    // holding the pre-rotation cookie value the browser had already sent —
    // gets rejected as a reused/stale token, bouncing an otherwise-valid
    // session to /login. Aborting on cleanup means only the second
    // (post-remount) invocation ever completes a real request.
    const controller = new AbortController();

    (async () => {
      try {
        const result = await apiClient.post<{ accessToken: string }>(
          "/api/auth/refresh",
          undefined,
          undefined,
          controller.signal,
        );
        if (!cancelled) applyToken(result.accessToken);
      } catch {
        // No valid session yet, or this request was aborted by the cleanup
        // above — both are normal, not an error to surface.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiClient.post<{ accessToken: string }>("/api/auth/login", {
        email,
        password,
      });
      const decodedRole = applyToken(result.accessToken);
      return { role: decodedRole };
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    await apiClient.post("/api/auth/logout").catch(() => {
      // Logout is idempotent server-side too — nothing to recover from here.
    });
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        role,
        userId,
        studentProfileId,
        batchScope,
        mustChangePassword,
        isLoading,
        isAuthenticated: accessToken !== null,
        login,
        logout,
        applySessionToken: applyToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
