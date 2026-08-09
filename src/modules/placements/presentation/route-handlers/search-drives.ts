import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchPlacementDrivesUseCase } from "../../infrastructure/container";
import { SearchPlacementDrivesQuerySchema } from "../validation";

export const searchPlacementDrivesRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = SearchPlacementDrivesQuerySchema.safeParse(query);
    if (!parsed.success) {
      return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
    }

    try {
      const drives = await searchPlacementDrivesUseCase.execute({ actor, filters: parsed.data });
      return NextResponse.json({ data: drives, meta: { count: drives.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
