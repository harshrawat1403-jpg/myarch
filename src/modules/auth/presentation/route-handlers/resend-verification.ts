import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getResendEmailVerificationUseCase } from "../../infrastructure/container";
import { badRequest, tooManyRequests } from "@/lib/http-errors";
import { emailTriggerRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { ResendVerificationRequestSchema } from "../validation";

/** Public, unauthenticated. Always the same generic response regardless of whether the email exists/is already verified — see ResendEmailVerificationUseCase's own anti-enumeration doc comment. */
export async function resendVerificationRouteHandler(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const parsed = ResendVerificationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid email", parsed.error.flatten().fieldErrors);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = clientIp(req);
  const [emailLimit, ipLimit] = await Promise.all([
    emailTriggerRateLimiter.consume(`resend-verification:email:${email}`),
    emailTriggerRateLimiter.consume(`resend-verification:ip:${ip}`),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfterMs = Math.max(emailLimit.retryAfterMs ?? 0, ipLimit.retryAfterMs ?? 0);
    return tooManyRequests("Too many requests. Please try again later.", retryAfterMs);
  }

  await getResendEmailVerificationUseCase().execute({ email });
  return NextResponse.json({
    data: { message: "If that email has a pending verification, we've resent the link." },
  });
}
