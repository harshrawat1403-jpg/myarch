import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { removeEventChecklistItemUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";

export const removeEventChecklistItemRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  const itemId = await extractRouteParam(routeContext, "itemId");
  if (!eventId || !itemId) return notFound("Checklist item not found");

  try {
    await removeEventChecklistItemUseCase.execute({ actor, eventId, itemId });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
