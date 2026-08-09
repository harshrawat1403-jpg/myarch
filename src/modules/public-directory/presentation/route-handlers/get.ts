import { NextRequest, NextResponse } from "next/server";
import { notFound, tooManyRequests } from "@/lib/http-errors";
import { publicDirectoryRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { extractRouteParam } from "@/lib/route-params";
import { getPublicProfileUseCase } from "../../infrastructure/container";
import { PublicProfileNotFoundError } from "../../domain/errors";

/** Public, unauthenticated. A private/unapproved/inactive/archived-batch student simply 404s — never a 403, since there's no auth boundary to fail (matches /api/files/[fileId]'s precedent, per §6). */
export async function getPublicProfileRouteHandler(req: NextRequest, routeContext: unknown): Promise<Response> {
  const limit = await publicDirectoryRateLimiter.consume(`public-directory:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many requests. Please try again later.", limit.retryAfterMs);
  }

  const studentId = await extractRouteParam(routeContext, "id");
  if (!studentId) return notFound("Profile not found");

  try {
    const profile = await getPublicProfileUseCase.execute(studentId);
    return NextResponse.json({ data: profile });
  } catch (err) {
    if (err instanceof PublicProfileNotFoundError) return notFound(err.message);
    throw err;
  }
}
