import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createAlumniUseCase } from "../../infrastructure/container";
import { StudentProfileNotFoundError, DuplicateAlumniLinkError } from "../../domain/errors";
import { CreateAlumniRequestSchema } from "../validation";

export const createAlumniRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateAlumniRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid alumni data", parsed.error.flatten().fieldErrors);
    }

    try {
      const alumni = await createAlumniUseCase.execute({ actor, ...parsed.data });
      return NextResponse.json({ data: alumni }, { status: 201 });
    } catch (err) {
      if (err instanceof StudentProfileNotFoundError) return notFound(err.message);
      if (err instanceof DuplicateAlumniLinkError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
