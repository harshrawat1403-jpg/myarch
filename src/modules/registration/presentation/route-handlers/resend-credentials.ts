import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { resendRegistrationCredentialsUseCase } from "../../infrastructure/container";
import {
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";

/** Secretary-only. Generates a new credential; an old password is never retrievable. */
export const resendRegistrationCredentialsRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const requestId = await extractRouteParam(routeContext, "id");
    if (!requestId) return notFound("Registration request not found");

    try {
      const result = await resendRegistrationCredentialsUseCase.execute({ actor, requestId });
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof RegistrationRequestNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidRegistrationTransitionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
