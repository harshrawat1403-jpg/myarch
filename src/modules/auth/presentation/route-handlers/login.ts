import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { InvalidCredentialsError } from "../../domain/errors";
import { getLoginUseCase } from "../../infrastructure/container";
import { setRefreshTokenCookie } from "../cookies";
import { badRequest, tooManyRequests, unauthorized } from "@/lib/http-errors";
import { loginRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginRouteHandler(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid email or password format", parsed.error.flatten().fieldErrors);
  }

  // FR-AUTH-05 / NFR-SEC-07: rate-limited per account AND per IP — two
  // independent checks, not one composite key, so a single attacker can't
  // spray one IP across many accounts (would never accumulate against a
  // per-pair key) nor hammer one account from many IPs (same reason). Both
  // are always consumed so each dimension's window stays accurate regardless
  // of which one trips first.
  const email = parsed.data.email.trim().toLowerCase();
  const ip = clientIp(req);
  const [emailLimit, ipLimit] = await Promise.all([
    loginRateLimiter.consume(`login:email:${email}`),
    loginRateLimiter.consume(`login:ip:${ip}`),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfterMs = Math.max(emailLimit.retryAfterMs ?? 0, ipLimit.retryAfterMs ?? 0);
    return tooManyRequests("Too many login attempts. Please try again later.", retryAfterMs);
  }

  try {
    const result = await getLoginUseCase().execute(parsed.data);
    const response = NextResponse.json({
      data: { accessToken: result.accessToken, role: result.actor.role },
    });
    setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return response;
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return unauthorized("Invalid email or password");
    }
    throw err;
  }
}
