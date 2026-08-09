import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { listMyNotificationsUseCase } from "../../infrastructure/container";

/** V4.0 E1 — GET /api/notifications. Any authenticated role; always the caller's own notifications. */
export const listNotificationsRouteHandler = withAuth(async (_req, { actor }) => {
  const notifications = await listMyNotificationsUseCase.execute(actor);
  return NextResponse.json({ data: notifications });
});
