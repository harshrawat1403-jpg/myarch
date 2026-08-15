import { NextResponse } from "next/server";
import { readFile } from "@/lib/file-storage";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { announcementAttachmentRepository } from "../../infrastructure/container";

/** Unauthenticated on purpose, mirroring events'/maintenance's own attachment routes: every attachment this route can reach is classification PUBLIC. */
export async function getAnnouncementAttachmentRouteHandler(_req: unknown, routeContext: unknown): Promise<Response> {
  const attachmentId = await extractRouteParam(routeContext, "attachmentId");
  if (!attachmentId) return notFound("Attachment not found");

  const attachment = await announcementAttachmentRepository.findById(attachmentId);
  if (!attachment) return notFound("Attachment not found");

  const bytes = await readFile(attachment.storageKey).catch(() => null);
  if (!bytes) return notFound("Attachment not found");

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: { "Content-Type": attachment.mimeType, "Cache-Control": "private, max-age=3600" },
  });
}
