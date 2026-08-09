import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchPublicationsUseCase } from "../../infrastructure/container";
import { SearchPublicationsQuerySchema } from "../validation";

export const searchPublicationsRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = SearchPublicationsQuerySchema.safeParse(query);
    const filters = parsed.success ? parsed.data : {};

    try {
      const publications = await searchPublicationsUseCase.execute(actor, filters);
      return NextResponse.json({ data: publications, meta: { count: publications.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
