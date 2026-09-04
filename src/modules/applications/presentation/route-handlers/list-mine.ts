import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listMyApplicationsUseCase } from "../../infrastructure/container";

export const listMyApplicationsRouteHandler = withAuth(async (_req, { actor }) => {
  try {
    return NextResponse.json({ data: await listMyApplicationsUseCase.execute({ actor }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    throw error;
  }
});
