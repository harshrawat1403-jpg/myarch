import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { recruiterDiscoveryRateLimiter } from "@/lib/rate-limiters";
import { listSentInterestsUseCase } from "../../infrastructure/container";

/** V4.0 C4 — GET /api/recruiters/interests, backing /recruiter/interests (the recruiter's own sent-interests view — distinct from the student-facing /api/student/interests). */
export const listSentInterestsRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const results = await listSentInterestsUseCase.execute(actor);
      return NextResponse.json({ data: results, meta: { count: results.length } });
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
