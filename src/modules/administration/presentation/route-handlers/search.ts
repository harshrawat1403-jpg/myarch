import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchUserDirectoryUseCase } from "../../infrastructure/container";
import { SearchDirectoryQuerySchema } from "../validation";

export const searchUserDirectoryRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = SearchDirectoryQuerySchema.safeParse(query);
    if (!parsed.success) {
      return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
    }

    try {
      const results = await searchUserDirectoryUseCase.execute({ actor, filters: parsed.data });
      return NextResponse.json({ data: results, meta: { count: results.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
