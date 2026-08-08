import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchCoordinatorsUseCase } from "../../infrastructure/container";
import { SearchCoordinatorsQuerySchema } from "../validation";

export const searchCoordinatorsRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = SearchCoordinatorsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return badRequest("Invalid search query", parsed.error.flatten().fieldErrors);
    }

    try {
      const results = await searchCoordinatorsUseCase.execute({ actor, filters: parsed.data });
      return NextResponse.json({ data: results, meta: { count: results.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
