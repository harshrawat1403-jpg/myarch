import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getRegistrationRequestUseCase } from "../../infrastructure/container";
import { RegistrationRequestNotFoundError } from "../../domain/errors";

export const getRegistrationRequestRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const requestId = await extractRouteParam(routeContext, "id");
    if (!requestId) return notFound("Registration request not found");

    try {
      const request = await getRegistrationRequestUseCase.execute({ actor, requestId });
      return NextResponse.json({ data: request });
    } catch (err) {
      if (err instanceof RegistrationRequestNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
