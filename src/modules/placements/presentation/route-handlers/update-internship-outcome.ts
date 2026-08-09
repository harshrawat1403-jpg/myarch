import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findApplicationBatchId, updateInternshipOutcomeUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";
import { UpdateInternshipOutcomeRequestSchema } from "../validation";

export const updateInternshipOutcomeRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateInternshipOutcomeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const outcome = await updateInternshipOutcomeUseCase.execute({
        actor,
        applicationId,
        companyFeedback: parsed.data.companyFeedback,
      });
      return NextResponse.json({ data: outcome });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InternshipOutcomeNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: async (_req, routeContext) => {
      const applicationId = await extractRouteParam(routeContext, "id");
      return applicationId ? findApplicationBatchId(applicationId) : undefined;
    },
  },
);
