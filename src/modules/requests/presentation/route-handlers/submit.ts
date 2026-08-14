import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { submitRequestUseCase } from "../../infrastructure/container";
import { SubmitRequestRequestSchema } from "../validation";

export const submitRequestRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = SubmitRequestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request data", parsed.error.flatten().fieldErrors);
  }

  try {
    const request = await submitRequestUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: request }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
