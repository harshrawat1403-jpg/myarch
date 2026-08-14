import { NextResponse } from "next/server";
import { readFile } from "@/lib/file-storage";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { maintenanceAttachmentRepository } from "../../infrastructure/container";

/**
 * Unauthenticated on purpose, mirroring auth's own serveFileRouteHandler
 * exactly: every attachment this route can reach is classification PUBLIC
 * (a photo of a broken fixture, never confidential) — the same
 * PUBLIC/PRIVATE distinction the schema already draws elsewhere. A separate
 * route rather than reusing serveFileRouteHandler, which is scoped to the
 * avatar file lookup specifically.
 */
export async function getMaintenanceAttachmentRouteHandler(_req: unknown, routeContext: unknown): Promise<Response> {
  const attachmentId = await extractRouteParam(routeContext, "attachmentId");
  if (!attachmentId) return notFound("Attachment not found");

  const attachment = await maintenanceAttachmentRepository.findById(attachmentId);
  if (!attachment) return notFound("Attachment not found");

  const bytes = await readFile(attachment.storageKey).catch(() => null);
  if (!bytes) return notFound("Attachment not found");

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: { "Content-Type": attachment.mimeType, "Cache-Control": "private, max-age=3600" },
  });
}
