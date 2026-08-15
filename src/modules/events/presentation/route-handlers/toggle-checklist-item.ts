import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { toggleEventChecklistItemUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";
import { ToggleEventChecklistItemRequestSchema } from "../validation";

export const toggleEventChecklistItemRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  const itemId = await extractRouteParam(routeContext, "itemId");
  if (!eventId || !itemId) return notFound("Checklist item not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ToggleEventChecklistItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid checklist update", parsed.error.flatten().fieldErrors);
  }

  try {
    const item = await toggleEventChecklistItemUseCase.execute({ actor, eventId, itemId, isDone: parsed.data.isDone });
    return NextResponse.json({ data: item });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
