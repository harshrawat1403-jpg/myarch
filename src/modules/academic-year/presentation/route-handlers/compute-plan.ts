import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { computeTransitionPlanUseCase } from "../../infrastructure/container";
import {
  BatchNotEligibleForArchivalError,
  BatchNotEligibleForGraduationError,
  TransitionBatchNotFoundError,
  TransitionCoordinatorNotFoundError,
} from "../../domain/errors";
import { ComputeTransitionPlanRequestSchema } from "../validation";

export const computeTransitionPlanRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = ComputeTransitionPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid transition plan request", parsed.error.flatten().fieldErrors);
    }

    try {
      const plan = await computeTransitionPlanUseCase.execute({ actor, ...parsed.data });
      return NextResponse.json({ data: plan });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof TransitionBatchNotFoundError) return notFound(err.message);
      if (err instanceof TransitionCoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof BatchNotEligibleForGraduationError) return badRequest(err.message);
      if (err instanceof BatchNotEligibleForArchivalError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
