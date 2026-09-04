import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateFormUseCase } from "../../infrastructure/container";
import { FormCommitteeNotFoundError, FormNotFoundError, InvalidFormDefinitionError, PublishedFormImmutableError } from "../../domain/errors";
import { UpdateFormRequestSchema } from "../validation";

export const updateFormRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const formId = await extractRouteParam(routeContext, "id");
  if (!formId) return notFound("Form not found");
  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateFormRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid form data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await updateFormUseCase.execute({ actor, formId, ...parsed.data }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormNotFoundError || error instanceof FormCommitteeNotFoundError) return notFound(error.message);
    if (error instanceof PublishedFormImmutableError) return conflict(error.message);
    if (error instanceof InvalidFormDefinitionError) return badRequest(error.message);
    throw error;
  }
});
