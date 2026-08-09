import { NextRequest, NextResponse } from "next/server";
import { badRequest, tooManyRequests } from "@/lib/http-errors";
import { publicDirectoryRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { searchPublicDirectoryUseCase } from "../../infrastructure/container";
import { PublicDirectoryQuerySchema } from "../validation";

/** Public, unauthenticated — no withAuth wrapper (there is no actor). Rate-limited per-IP, same inline pattern login/refresh/registration-submit already use. */
export async function searchPublicDirectoryRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await publicDirectoryRateLimiter.consume(`public-directory:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many requests. Please try again later.", limit.retryAfterMs);
  }

  const query = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = PublicDirectoryQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search query", parsed.error.flatten().fieldErrors);
  }

  const results = await searchPublicDirectoryUseCase.execute(parsed.data);
  return NextResponse.json({ data: results, meta: { count: results.length } });
}
