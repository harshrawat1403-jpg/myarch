import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { badRequest, conflict, tooManyRequests } from "@/lib/http-errors";
import { signupRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { getSignupRecruiterUseCase } from "../../infrastructure/container";
import { DuplicateEmailError } from "../../domain/errors";
import { SignupRecruiterRequestSchema } from "../validation";

/** Public, unauthenticated (MYARCH Phase 1, §2.4) — mirrors submitRegistrationRequestRouteHandler's exact shape (rate limit → validate → execute → map errors). */
export async function signupRecruiterRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await signupRateLimiter.consume(`recruiter-signup:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many signup attempts. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = SignupRecruiterRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid signup data", parsed.error.flatten().fieldErrors);
  }

  try {
    const recruiter = await getSignupRecruiterUseCase().execute(parsed.data);
    return NextResponse.json(
      { data: { id: recruiter.id, approvalStatus: recruiter.approvalStatus } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof DuplicateEmailError) return conflict(err.message);
    throw err;
  }
}
