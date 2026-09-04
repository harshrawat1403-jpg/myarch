import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createFormUseCase } from "../../infrastructure/container";
import { FormCommitteeNotFoundError, InvalidFormDefinitionError } from "../../domain/errors";
import { CreateFormRequestSchema } from "../validation";

export const createFormRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateFormRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid form data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await createFormUseCase.execute({ actor, ...parsed.data }) }, { status: 201 });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormCommitteeNotFoundError) return notFound(error.message);
    if (error instanceof InvalidFormDefinitionError) return badRequest(error.message);
    if (error instanceof Error && error.message.includes("unique")) return conflict(error.message);
    throw error;
  }
});
