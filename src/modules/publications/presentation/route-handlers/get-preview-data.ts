import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPreviewDataUseCase } from "../../infrastructure/container";
import { PublicationContentSchema } from "../validation";

export const getPreviewDataRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = PublicationContentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid content", parsed.error.flatten().fieldErrors);

    try {
      const resolved = await getPreviewDataUseCase.execute(actor, parsed.data);
      return NextResponse.json({ data: resolved });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
