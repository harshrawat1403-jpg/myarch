import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { badRequest, conflict, tooManyRequests } from "@/lib/http-errors";
import { signupRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { getSignupAlumniUseCase } from "../../infrastructure/container";
import { DuplicateEmailError } from "../../domain/errors";
import { SignupAlumniRequestSchema } from "../validation";

/** Public, unauthenticated (MYARCH Phase 1, §2.4) — mirrors signupRecruiterRouteHandler's exact shape. */
export async function signupAlumniRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await signupRateLimiter.consume(`alumni-signup:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many signup attempts. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = SignupAlumniRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid signup data", parsed.error.flatten().fieldErrors);
  }

  try {
    const alumni = await getSignupAlumniUseCase().execute(parsed.data);
    return NextResponse.json({ data: { id: alumni.id, approvalStatus: alumni.approvalStatus } }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateEmailError) return conflict(err.message);
    throw err;
  }
}
