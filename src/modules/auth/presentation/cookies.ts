import type { NextResponse } from "next/server";

export const REFRESH_TOKEN_COOKIE = "tnparch_refresh_token";

/**
 * The refresh token cookie: httpOnly (never readable by client JS — the
 * mechanism that closes off XSS-driven token theft), Secure in production,
 * SameSite=Strict (this is a first-party, single-origin app — there is no
 * legitimate cross-site request that should carry this cookie), and scoped
 * to only the auth endpoints that ever need it, shrinking its blast radius.
 * See docs/security/14_Security_Architecture.md.
 */
export function setRefreshTokenCookie(response: NextResponse, rawToken: string, expiresAt: Date): void {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    expires: expiresAt,
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    expires: new Date(0),
  });
}
