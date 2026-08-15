import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getCreateCoordinatorUseCase } from "../../infrastructure/container";
import {
  BatchNotFoundError,
  DuplicateEmailError,
  InactiveCoordinatorError,
  InvalidCustomPositionError,
  MaxActiveCoordinatorsError,
  MaxActiveMaintenanceRoleError,
} from "../../domain/errors";
import { CreateCoordinatorRequestSchema } from "../validation";

export const createCoordinatorRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateCoordinatorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid coordinator data", parsed.error.flatten().fieldErrors);
    }

    try {
      const result = await getCreateCoordinatorUseCase().execute({ actor, ...parsed.data });
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      if (err instanceof DuplicateEmailError) return conflict(err.message);
      if (err instanceof InvalidCustomPositionError) return badRequest(err.message);
      if (
        err instanceof MaxActiveMaintenanceRoleError ||
        err instanceof InactiveCoordinatorError ||
        err instanceof MaxActiveCoordinatorsError
      ) {
        return badRequest(err.message);
      }
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
