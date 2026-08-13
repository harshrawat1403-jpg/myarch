import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DemoAccountNotSeededError } from "../../domain/errors";
import { getDemoLoginUseCase } from "../../infrastructure/container";
import { setRefreshTokenCookie } from "../cookies";
import { badRequest, notFound, serviceUnavailable, tooManyRequests } from "@/lib/http-errors";
import { demoLoginRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";

const DemoLoginRequestSchema = z.object({
  persona: z.enum(["STUDENT", "RECRUITER", "ADMIN"]),
});

/**
 * Public MYARCH showcase — "Visit as Student / Recruiter / Demo Admin" on
 * the marketing landing page. Unauthenticated by nature (there's no session
 * yet to check), so rate-limited per IP the same way login/refresh/public
 * registration already are. See DemoLoginUseCase's own doc comment for the
 * full safety model (fixed seed accounts only, read-only sessions).
 *
 * Everything below — including the rate-limit check itself — runs inside
 * one try/catch. Both the limiter and DemoLoginUseCase touch the database
 * (rate-limit bucket rows, the seeded user lookup, env-derived JWT signing,
 * the RefreshToken write), and an unrelated infrastructure failure there
 * (DB unreachable, a migration not yet applied, a missing/invalid env var)
 * must never be allowed to escape as a raw, non-JSON error — the frontend's
 * envelope parser has no `error.message` to show for that and falls back to
 * a generic "Request failed" with zero diagnostic value. The real cause is
 * logged here, server-side only; the client only ever gets a stable,
 * non-sensitive code.
 */
export async function demoLoginRouteHandler(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const parsed = DemoLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid demo persona", parsed.error.flatten().fieldErrors);
  }

  try {
    const limit = await demoLoginRateLimiter.consume(`demo-login:ip:${clientIp(req)}`);
    if (!limit.allowed) {
      return tooManyRequests(
        "Too many requests. Please try again in a moment.",
        limit.retryAfterMs,
      );
    }

    const result = await getDemoLoginUseCase().execute(parsed.data);
    const response = NextResponse.json({
      data: { accessToken: result.accessToken, role: result.actor.role },
    });
    setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return response;
  } catch (err) {
    if (err instanceof DemoAccountNotSeededError) {
      return notFound(err.message);
    }
    console.error("[demo-login] unexpected failure", err);
    return serviceUnavailable("Demo sign-in is temporarily unavailable. Please try again shortly.");
  }
}
