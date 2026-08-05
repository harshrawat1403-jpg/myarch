import { NextRequest, NextResponse } from "next/server";
import {
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenReusedError,
} from "../../domain/errors";
import { getRefreshAccessTokenUseCase } from "../../infrastructure/container";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie, setRefreshTokenCookie } from "../cookies";
import { unauthorized } from "@/lib/http-errors";

export async function refreshRouteHandler(req: NextRequest): Promise<Response> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return unauthorized("Missing refresh token");
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
