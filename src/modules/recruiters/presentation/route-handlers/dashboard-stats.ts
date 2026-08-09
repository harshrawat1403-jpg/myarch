import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { recruiterDiscoveryRateLimiter } from "@/lib/rate-limiters";
import { getDashboardStatsUseCase } from "../../infrastructure/container";

export const recruiterDashboardStatsRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const stats = await getDashboardStatsUseCase.execute({ actor });
      return NextResponse.json({ data: stats });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["RECRUITER"],
    rateLimit: {
      limiter: recruiterDiscoveryRateLimiter,
      key: (actor) => `recruiter-discovery:${actor.userId}`,
      message: "Too many requests. Please slow down and try again shortly.",
    },
  },
);
