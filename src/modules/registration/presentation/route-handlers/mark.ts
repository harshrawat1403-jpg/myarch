import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { markRegistrationRequestUseCase } from "../../infrastructure/container";
import { InvalidRegistrationTransitionError, RegistrationRequestNotFoundError } from "../../domain/errors";
import { MarkRegistrationRequestSchema } from "../validation";

export const markRegistrationRequestRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const requestId = await extractRouteParam(routeContext, "id");
    if (!requestId) return notFound("Registration request not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = MarkRegistrationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const request = await markRegistrationRequestUseCase.execute({
        actor,
        requestId,
        status: parsed.data.status,
        comment: parsed.data.comment,
      });
      return NextResponse.json({ data: request });
    } catch (err) {
      if (err instanceof RegistrationRequestNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidRegistrationTransitionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
