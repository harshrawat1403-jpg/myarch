import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { extractRouteParam } from "@/lib/route-params";
import { InvalidContentOverrideError } from "../../domain/errors";
import { saveContentOverrideUseCase } from "../../infrastructure/container";
import { SaveContentOverrideRequestSchema } from "../validation";

export const saveContentOverrideRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const page = await extractRouteParam(routeContext, "page");
    const contentKey = await extractRouteParam(routeContext, "contentKey");
    if (!page || !contentKey) return badRequest("Missing page or content key");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SaveContentOverrideRequestSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid content value", parsed.error.flatten().fieldErrors);

    try {
      const saved =
        parsed.data.type === "TEXT"
          ? await saveContentOverrideUseCase.execute({ actor, page, contentKey, type: "TEXT", textValue: parsed.data.textValue })
          : await saveContentOverrideUseCase.execute({ actor, page, contentKey, type: "IMAGE", fileId: parsed.data.fileId });
      return NextResponse.json({ data: saved });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidContentOverrideError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
