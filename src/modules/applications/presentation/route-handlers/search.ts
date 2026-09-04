import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchApplicationsUseCase } from "../../infrastructure/container";
import { ApplicationSearchQuerySchema } from "../validation";

export const searchApplicationsRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = ApplicationSearchQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return badRequest("Invalid application filters", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await searchApplicationsUseCase.execute({ actor, filters: parsed.data }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    throw error;
  }
});
