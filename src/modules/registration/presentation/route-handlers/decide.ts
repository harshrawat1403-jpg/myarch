import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { decideRegistrationRequestUseCase } from "../../infrastructure/container";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";
import { DecideRegistrationRequestSchema } from "../validation";

/** Secretary-only (Q1) — the sole final approval authority for registration requests, platform-wide. */
export const decideRegistrationRequestRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const requestId = await extractRouteParam(routeContext, "id");
    if (!requestId) return notFound("Registration request not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = DecideRegistrationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const result = await decideRegistrationRequestUseCase.execute({
        actor,
        requestId,
        decision: parsed.data.decision,
        rejectionReason: parsed.data.rejectionReason,
      });
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof RegistrationRequestNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidRegistrationTransitionError) return badRequest(err.message);
      if (err instanceof DuplicateRegistrationEmailError) return conflict(err.message);
      if (err instanceof DuplicateRegistrationRollNumberError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
