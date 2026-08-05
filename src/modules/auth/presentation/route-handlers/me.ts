import { NextResponse } from "next/server";
import { withAuth } from "../../infrastructure/container";

/**
 * Minimal protected route demonstrating the required request flow end to
 * end (docs/api/10_API_Architecture.md). No dedicated Student/Batch/Profile
 * module exists yet (that's Days 3–6 of docs/planning/16_Project_Roadmap.md),
 * so this endpoint's only job is to prove the auth foundation itself works:
 * it returns exactly what the verified access token says about the caller.
 */
export const meRouteHandler = withAuth(async (_req, { actor }) => {
  return NextResponse.json({
    data: {
      userId: actor.userId,
      role: actor.role,
      batchScope: actor.batchScope,
      studentProfileId: actor.studentProfileId,
    },
  });
});
