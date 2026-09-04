import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setFormStatusUseCase } from "../../infrastructure/container";
import { FormNotFoundError, InvalidFormDefinitionError, InvalidFormTransitionError, PublishedFormImmutableError } from "../../domain/errors";
import { z } from "zod";

const schema = z.object({ status: z.enum(["PUBLISHED", "CLOSED", "ARCHIVED"]) });

export const setFormStatusRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const formId = await extractRouteParam(routeContext, "id");
  if (!formId) return notFound("Form not found");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid form status", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await setFormStatusUseCase.execute({ actor, formId, status: parsed.data.status }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormNotFoundError) return notFound(error.message);
    if (error instanceof InvalidFormTransitionError || error instanceof PublishedFormImmutableError) return conflict(error.message);
    if (error instanceof InvalidFormDefinitionError) return badRequest(error.message);
    throw error;
  }
});
