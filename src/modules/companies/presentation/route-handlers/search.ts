import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchCompaniesUseCase } from "../../infrastructure/container";
import { SearchCompaniesQuerySchema } from "../validation";

export const searchCompaniesRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = SearchCompaniesQuerySchema.safeParse(query);
    if (!parsed.success) {
      return badRequest("Invalid search query", parsed.error.flatten().fieldErrors);
    }

    try {
      const results = await searchCompaniesUseCase.execute({ actor, filters: parsed.data });
      return NextResponse.json({ data: results, meta: { count: results.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
