import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getResetPasswordUseCase } from "../../infrastructure/container";
import { InvalidPasswordResetTokenError, PasswordResetTokenExpiredError } from "../../domain/errors";
import { badRequest, tooManyRequests } from "@/lib/http-errors";
import { tokenConsumptionRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { ResetPasswordRequestSchema } from "../validation";

/** Public, unauthenticated — proving control of the token is the authentication here (see ResetPasswordUseCase's own doc comment). */
export async function resetPasswordRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await tokenConsumptionRateLimiter.consume(`reset-password:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many attempts. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = ResetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
  }

  try {
    await getResetPasswordUseCase().execute(parsed.data);
    return NextResponse.json({ data: { message: "Your password has been reset. You can now sign in." } });
  } catch (err) {
    if (err instanceof InvalidPasswordResetTokenError) return badRequest(err.message);
    if (err instanceof PasswordResetTokenExpiredError) return badRequest(err.message);
    throw err;
  }
}
