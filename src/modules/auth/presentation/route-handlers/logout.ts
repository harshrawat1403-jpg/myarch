import { NextRequest, NextResponse } from "next/server";
import { getLogoutUseCase } from "../../infrastructure/container";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie } from "../cookies";

export async function logoutRouteHandler(req: NextRequest): Promise<Response> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Idempotent — see LogoutUseCase's doc comment for why this never errors.
  await getLogoutUseCase().execute({ refreshToken });

  const response = NextResponse.json({ data: { success: true } });
  clearRefreshTokenCookie(response);
  return response;
}
