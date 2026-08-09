import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listPublicationTemplatesUseCase } from "../../infrastructure/container";
import { ListTemplatesQuerySchema } from "../validation";

export const listPublicationTemplatesRouteHandler = withAuth(
  async (req, { actor }) => {
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = ListTemplatesQuerySchema.safeParse(query);
    const type = parsed.success ? parsed.data.type : undefined;

    try {
      const templates = await listPublicationTemplatesUseCase.execute(actor, type);
      return NextResponse.json({ data: templates });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
