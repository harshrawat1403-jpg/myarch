import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchFormsUseCase } from "../../infrastructure/container";
import { SearchFormsQuerySchema } from "../validation";

export const searchFormsRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = SearchFormsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return badRequest("Invalid form filters", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await searchFormsUseCase.execute({ actor, filters: parsed.data, availableOnly: actor.role === "STUDENT" }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    throw error;
  }
});
