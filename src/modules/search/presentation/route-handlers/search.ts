import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { globalSearchUseCase } from "../../infrastructure/container";
import { GlobalSearchQuerySchema } from "../validation";

/** No `roles` restriction — every authenticated role may search; GlobalSearchUseCase decides what each role is entitled to see. */
export const globalSearchRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = GlobalSearchQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search query", parsed.error.flatten().fieldErrors);
  }

  try {
    const results = await globalSearchUseCase.execute(actor, parsed.data.q);
    return NextResponse.json({ data: results });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
