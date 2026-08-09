import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listSelectableDataUseCase } from "../../infrastructure/container";
import { ListSelectableDataQuerySchema } from "../validation";

export const listSelectableDataRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = ListSelectableDataQuerySchema.safeParse(query);
    if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten().fieldErrors);

    try {
      const result = await listSelectableDataUseCase.execute(actor, parsed.data.kind, parsed.data.batchId);
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
