import { NextResponse } from "next/server";
import { getMeProfile, withAuth } from "../../infrastructure/container";

/**
 * The "who am I" endpoint — claims from the verified access token plus a
 * small DB read for email/fullName (V3.0: Account Settings needs the
 * current values to prefill its form; the token itself deliberately never
 * carries email/name, only role/scope). One extra query per call, same
 * cadence as the refresh endpoint already hits the DB on every use.
 */
export const meRouteHandler = withAuth(
  async (_req, { actor }) => {
    const profile = await getMeProfile(actor);
    return NextResponse.json({
      data: {
        userId: actor.userId,
        role: actor.role,
        batchScope: actor.batchScope,
        studentProfileId: actor.studentProfileId,
        mustChangePassword: actor.mustChangePassword ?? false,
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
      },
    });
  },
  { allowMustChangePassword: true },
);
