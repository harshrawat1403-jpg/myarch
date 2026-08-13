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

/**
 * A distinct code from plain FORBIDDEN so the frontend can redirect to the
 * forced change-password flow instead of showing a generic permission-denied
 * error (see with-auth.ts's `allowMustChangePassword` gate).
 */
export function passwordChangeRequired(message: string): NextResponse {
  return NextResponse.json({ error: { code: "MUST_CHANGE_PASSWORD", message } }, { status: 403 });
}

/**
 * Public showcase demo sessions (`AuthenticatedActor.isDemo`) are read-only
 * platform-wide — see with-auth.ts. A distinct code, same shape as
 * `passwordChangeRequired` above, so the frontend can show a friendly
 * "this is a demo" message rather than a generic permission error.
 */
export function demoActionBlocked(message: string): NextResponse {
  return NextResponse.json({ error: { code: "DEMO_READ_ONLY", message } }, { status: 403 });
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

/** An unexpected failure (DB unreachable, misconfigured environment, etc.) that isn't the caller's fault and carries no safe-to-expose detail — the message must stay generic; log the real cause server-side at the call site instead. */
export function serviceUnavailable(message: string): NextResponse {
  return NextResponse.json({ error: { code: "SERVICE_UNAVAILABLE", message } }, { status: 503 });
}

export function tooManyRequests(message: string, retryAfterMs?: number): NextResponse {
  const headers = retryAfterMs
    ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) }
    : undefined;
  return NextResponse.json({ error: { code: "RATE_LIMITED", message } }, { status: 429, headers });
}
