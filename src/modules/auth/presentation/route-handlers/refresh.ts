import { NextRequest, NextResponse } from "next/server";
import {
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenReusedError,
} from "../../domain/errors";
import { getRefreshAccessTokenUseCase } from "../../infrastructure/container";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie, setRefreshTokenCookie } from "../cookies";
import { tooManyRequests, unauthorized } from "@/lib/http-errors";
import { refreshRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";

export async function refreshRouteHandler(req: NextRequest): Promise<Response> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return unauthorized("Missing refresh token");
  }

  // V4.0 A2 (§18): retrofits a pre-existing gap — this endpoint previously
  // had no rate limiting at all. Per-IP only, since no account is known
  // until the refresh token itself is validated below.
  const ipLimit = await refreshRateLimiter.consume(`refresh:ip:${clientIp(req)}`);
  if (!ipLimit.allowed) {
    return tooManyRequests("Too many requests. Please try again later.", ipLimit.retryAfterMs);
  }

  try {
    const result = await getRefreshAccessTokenUseCase().execute({ refreshToken });
    const response = NextResponse.json({
      data: { accessToken: result.accessToken, role: result.actor.role },
    });
    setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return response;
  } catch (err) {
    if (
      err instanceof InvalidRefreshTokenError ||
      err instanceof RefreshTokenExpiredError ||
      err instanceof RefreshTokenReusedError
    ) {
      const response = unauthorized("Session expired. Please log in again.");
      clearRefreshTokenCookie(response);
      return response;
    }
    throw err;
  }
}
