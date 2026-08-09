import { NextRequest, NextResponse } from "next/server";
import { badRequest, conflict, notFound, tooManyRequests } from "@/lib/http-errors";
import { publicRegistrationRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { submitRegistrationRequestUseCase } from "../../infrastructure/container";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  RegistrationBatchNotFoundError,
  RegistrationBatchNotOpenError,
} from "../../domain/errors";
import { SubmitRegistrationRequestSchema } from "../validation";

/** Public, unauthenticated — no withAuth wrapper (§7 step 2: no account exists yet to authenticate as). Rate-limited per-IP inline, the same pattern login.ts/refresh.ts already use for their own unauthenticated/pre-actor checks. */
export async function submitRegistrationRequestRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await publicRegistrationRateLimiter.consume(`registration:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many registration attempts. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = SubmitRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid registration data", parsed.error.flatten().fieldErrors);
  }

  try {
    const { phone, personalEmail, notes, ...rest } = parsed.data;
    const request = await submitRegistrationRequestUseCase.execute({
      ...rest,
      submittedData: { phone, personalEmail, notes },
    });
    return NextResponse.json({ data: { id: request.id, status: request.status } }, { status: 201 });
  } catch (err) {
    if (err instanceof RegistrationBatchNotFoundError) return notFound(err.message);
    if (err instanceof RegistrationBatchNotOpenError) return badRequest(err.message);
    if (err instanceof DuplicateRegistrationEmailError) return conflict(err.message);
    if (err instanceof DuplicateRegistrationRollNumberError) return conflict(err.message);
    throw err;
  }
}
