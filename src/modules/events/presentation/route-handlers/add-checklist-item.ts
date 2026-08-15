import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addEventChecklistItemUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";
import { AddEventChecklistItemRequestSchema } from "../validation";

export const addEventChecklistItemRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddEventChecklistItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid checklist item", parsed.error.flatten().fieldErrors);
  }

  try {
    const item = await addEventChecklistItemUseCase.execute({ actor, eventId, label: parsed.data.label });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
