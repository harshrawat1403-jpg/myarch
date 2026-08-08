import { NextResponse } from "next/server";
import { CurrentPasswordIncorrectError, NewPasswordSameAsCurrentError } from "../../domain/errors";
import { getChangeOwnPasswordUseCase, withAuth } from "../../infrastructure/container";
import { setRefreshTokenCookie } from "../cookies";
import { ChangePasswordRequestSchema } from "../validation";
import { badRequest, forbidden } from "@/lib/http-errors";

export const changePasswordRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = ChangePasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid password change request", parsed.error.flatten().fieldErrors);
    }

    try {
      const result = await getChangeOwnPasswordUseCase().execute({
        actor,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });

      const response = NextResponse.json({
        data: { accessToken: result.accessToken, role: result.actor.role },
      });
      setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
      return response;
    } catch (err) {
      if (err instanceof CurrentPasswordIncorrectError) {
        return forbidden(err.message);
      }
      if (err instanceof NewPasswordSameAsCurrentError) {
        return badRequest(err.message);
      }
      throw err;
    }
  },
  // Every authenticated role may reach this route even while
  // mustChangePassword is true — it's the one route that flag exists to
  // force a session toward.
  { allowMustChangePassword: true },
);
