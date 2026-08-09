import type { NextRequest } from "next/server";

/** Best-effort client IP for per-IP rate limiting — the standard `X-Forwarded-For` first-hop convention. Promoted here once a fourth call site needed it (login, refresh, registration submit, now public directory) — the same "second use is the signal" rule already applied to AuditRecorder/BatchLookup. */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
