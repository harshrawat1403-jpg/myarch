import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { markNotificationReadUseCase } from "../../infrastructure/container";
import { NotificationNotFoundError } from "../../domain/errors";

/** V4.0 E1 — PATCH /api/notifications/[id]/read. Any authenticated role; scoped to the caller's own notifications. */
export const markNotificationReadRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const notificationId = await extractRouteParam(routeContext, "id");
  if (!notificationId) return notFound("Notification not found");

  try {
    await markNotificationReadUseCase.execute(actor, notificationId);
    return NextResponse.json({ data: { id: notificationId } });
  } catch (err) {
    if (err instanceof NotificationNotFoundError) return notFound(err.message);
    throw err;
  }
});
