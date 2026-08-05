import { NextResponse } from "next/server";

/**
 * Shared error-response envelope, matching docs/api/10_API_Architecture.md:
 * { "error": { "code": ..., "message": ... } }. Every route handler across
 * every module uses this one (auth's own pre-dating copy was consolidated
 * into this file during the Production Readiness Sprint — see CHANGELOG).
 */
export function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}

export function forbidden(message: string): NextResponse {
  return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message, details } },
    { status: 400 },
  );
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: { code: "CONFLICT", message } }, { status: 409 });
}

export function tooManyRequests(message: string, retryAfterMs?: number): NextResponse {
  const headers = retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined;
  return NextResponse.json({ error: { code: "RATE_LIMITED", message } }, { status: 429, headers });
}
