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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeAccessTokenClaims(token: string): { sub?: string; role?: string } {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return {};
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as { sub?: string; role?: string };
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
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((token: string): Role | null => {
    const claims = decodeAccessTokenClaims(token);
    const decodedRole = (claims.role as Role) ?? null;
    setAccessToken(token);
    setRole(decodedRole);
    setUserId(claims.sub ?? null);
    return decodedRole;
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRole(null);
    setUserId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await apiClient.post<{ accessToken: string }>("/api/auth/refresh");
        if (!cancelled) applyToken(result.accessToken);
      } catch {
        // No valid session yet — normal for a first visit or a logged-out user.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiClient.post<{ accessToken: string }>("/api/auth/login", { email, password });
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
        isLoading,
        isAuthenticated: accessToken !== null,
        login,
        logout,
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
