import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getVerifyEmailUseCase,
  InvalidVerificationTokenError,
  VerificationTokenExpiredError,
} from "@/modules/auth";
import {
  getPublicRegistrationVerificationStatus,
  markRegistrationRequestEmailVerified,
} from "@/modules/registration";
import { badRequest, tooManyRequests } from "@/lib/http-errors";
import { tokenConsumptionRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";

const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});

/**
 * MYARCH Phase 1 (§2.4) — deliberately NOT a thin re-export of a module
 * route-handler, unlike every other route in this app. VerifyEmailUseCase
 * (in the auth module) only ever touches auth's own tables — it cannot
 * import the registration module to mark a RegistrationRequest verified
 * without creating a real circular module dependency (registration already
 * depends on auth; auth depending back on registration would complete the
 * cycle — see VerifyEmailUseCase's own doc comment). This route is the
 * correct place for that one remaining step instead: it is free to import
 * from both modules' public barrels, since app/api routes sit outside every
 * feature module and are never themselves imported by one.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const limit = await tokenConsumptionRateLimiter.consume(`verify-email:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many attempts. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = VerifyEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await getVerifyEmailUseCase().execute({ token: parsed.data.token });

    if (result.registrationRequestId) {
      await markRegistrationRequestEmailVerified(result.registrationRequestId);
      const registration = await getPublicRegistrationVerificationStatus(result.registrationRequestId);
      return NextResponse.json({ data: { email: result.email, registration } });
    }

    return NextResponse.json({ data: { email: result.email, registration: null, accountExists: result.userId !== null } });
  } catch (err) {
    if (err instanceof InvalidVerificationTokenError) return badRequest(err.message);
    if (err instanceof VerificationTokenExpiredError) return badRequest(err.message);
    throw err;
  }
}
