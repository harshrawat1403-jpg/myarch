import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { submitFormUseCase } from "../../infrastructure/container";
import { DuplicateFormApplicationError, FormNotAvailableError, InvalidFormAnswerError } from "../../domain/errors";
import { SubmitFormRequestSchema } from "../validation";

export const submitFormRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const formId = await extractRouteParam(routeContext, "id");
  if (!formId) return notFound("Form not found");
  const parsed = SubmitFormRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid application data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await submitFormUseCase.execute({ actor, formId, answers: parsed.data.answers }) }, { status: 201 });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormNotAvailableError) return conflict(error.message);
    if (error instanceof DuplicateFormApplicationError) return conflict(error.message);
    if (error instanceof InvalidFormAnswerError) return badRequest(error.message);
    throw error;
  }
});
