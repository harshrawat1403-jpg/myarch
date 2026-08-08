import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateRecruiterAccountUseCase } from "../../../infrastructure/container";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";
import { UpdateRecruiterAccountRequestSchema } from "../../validation";

export const updateRecruiterAccountRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const recruiterId = await extractRouteParam(routeContext, "id");
    if (!recruiterId) return notFound("Recruiter not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateRecruiterAccountRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid recruiter data", parsed.error.flatten().fieldErrors);
    }

    try {
      const recruiter = await updateRecruiterAccountUseCase.execute({ actor, recruiterId, ...parsed.data });
      return NextResponse.json({ data: recruiter });
    } catch (err) {
      if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
