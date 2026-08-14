import { NextResponse } from "next/server";
import { readFile } from "@/lib/file-storage";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { requestAttachmentRepository } from "../../infrastructure/container";

/** Unauthenticated on purpose — mirrors maintenance's getMaintenanceAttachmentRouteHandler exactly (classification PUBLIC). */
export async function getRequestAttachmentRouteHandler(_req: unknown, routeContext: unknown): Promise<Response> {
  const attachmentId = await extractRouteParam(routeContext, "attachmentId");
  if (!attachmentId) return notFound("Attachment not found");

  const attachment = await requestAttachmentRepository.findById(attachmentId);
  if (!attachment) return notFound("Attachment not found");

  const bytes = await readFile(attachment.storageKey).catch(() => null);
  if (!bytes) return notFound("Attachment not found");

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: { "Content-Type": attachment.mimeType, "Cache-Control": "private, max-age=3600" },
  });
}
